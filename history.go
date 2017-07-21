package main

import (
	"net/http"
	"strconv"
	"time"
	"strings"
	"os"
	"sort"
	"log"
	"bufio"
	"github.com/antigloss/go/logger"
	"encoding/json"
	"errors"
)

const RESULTS_PER_PAGE = 60 * 60 //Return 1 hour of results per page

type HistoryEntry struct{

	JobName string
	Time int64
	Temp float64
	Target float64
	IsHeating bool

}

func (he *HistoryEntry) toString() string{
	timeStr := strconv.FormatInt(he.Time, 36)
	tempStr := strconv.FormatFloat(he.Temp, 'f', -1, 64)
	targetStr := strconv.FormatFloat(he.Target, 'f', -1, 64)
	isHeating := "0"
	if he.IsHeating{
		isHeating = "1"
	}
	return he.JobName + "~" + timeStr + "~" + tempStr + "~" + targetStr + "~" + isHeating
}

func fromString(hEntryStr string) (*HistoryEntry, error){
	subs := strings.Split(hEntryStr, "~")

	if len(subs) < 4 {
		return nil, errors.New("Bad input text")
	}

	jobName := ""
	time := subs[0]
	temp := subs[1]
	target := subs[2]
	isHeating := subs[3]

	if len(subs) >= 5 {
		jobName = subs[0]
		time = subs[1]
		temp = subs[2]
		target = subs[3]
		isHeating = subs[4]
	}

	timeInt, _ := strconv.ParseInt(time, 36, 64)
	tempFloat, _ := strconv.ParseFloat(temp, 64)
	targetFloat, _ := strconv.ParseFloat(target, 64)
	heatingBool := isHeating == "1"

	return &HistoryEntry{
		JobName: jobName,
		Time: timeInt,
		Temp: tempFloat,
		Target: targetFloat,
		IsHeating: heatingBool,
	}, nil
}

type ByModTime []os.FileInfo

func (fis ByModTime) Len() int {
	return len(fis)
}

func (fis ByModTime) Swap(i, j int) {
	fis[i], fis[j] = fis[j], fis[i]
}

func (fis ByModTime) Less(i, j int) bool {
	return fis[i].ModTime().After(fis[j].ModTime())
}

type HistoryResponse struct {
	History []*HistoryEntry
	HasPrev bool
	Page int
}

func dumpHistoryJson(w http.ResponseWriter, page int, history []*HistoryEntry) {
	w.Header().Set("Content-type", "application/json")

	log.Println("history len: " + strconv.Itoa(len(history)))
	historyResponse := &HistoryResponse{
		History: history,
		HasPrev: len(history) >= RESULTS_PER_PAGE,
		Page: page,
	}

	b, err := json.Marshal(historyResponse)
	if err != nil {
		log.Panicf("could not marshal historical temps to json: %v", err)
	}
	w.Write(b)
}

func SetJobName(sv *SousVide, r *http.Request){
	jobName := r.FormValue("name")
	sv.JobName = jobName
}

func GetHistory(w http.ResponseWriter, r *http.Request){
	pageNum := 0
	page := r.FormValue("page")
	if len(page) > 0 {
		pageNum, _ = strconv.Atoi(page)
	}

	history := retrieveHistory(pageNum)
	dumpHistoryJson(w, pageNum, history)
}

func LogHistory(sv *SousVide){
	entry := &HistoryEntry{
		JobName : sv.JobName,
		Time : time.Now().UnixNano() / int64(time.Millisecond),
		Temp: float64(sv.Temp),
	}
	logger.Info(entry.toString())
}

func retrieveHistory(page int) []*HistoryEntry{
	curEntry := 0
	lastEntry := RESULTS_PER_PAGE * (page+1)
	firstEntry := lastEntry - RESULTS_PER_PAGE

	entries := make([][]*HistoryEntry, 0, 100)
	total := 0

	f, _ := os.Open("/var/log/sousvide/therm")
	fis, _ := f.Readdir(-1)
	defer f.Close()
	sort.Sort(ByModTime(fis))

	skippedSimLink := false //First file is sym link to real file
	for _, fi := range fis {
		if curEntry > lastEntry {
			break
		}

		if !skippedSimLink {
			skippedSimLink = true
			continue
		}

		if file, err := os.Open("/var/log/sousvide/therm/" + fi.Name()); err == nil {

			// make sure it gets closed
			defer file.Close()

			log.Println("Opened file: " + fi.Name())

			fileEntries := make([]*HistoryEntry, 0, RESULTS_PER_PAGE)
			// create a new scanner and read the file line by line
			scanner := bufio.NewScanner(file)
			for scanner.Scan() && curEntry <= lastEntry {
				line := scanner.Text()

				if curEntry >= firstEntry && curEntry <= lastEntry {
					timeEndPos := strings.Index(line, "] ") + 2

					if timeEndPos < 1 {
						log.Println("History entry format not found: " + line)
						curEntry -= 1
					} else{
						historyStr := line[timeEndPos:]
						hEntry, err := fromString(historyStr)
						if err != nil{
							log.Println("Got bad log line: " + line)
							curEntry -= 1
						} else{
							fileEntries = append(fileEntries, hEntry)
							total += 1
						}
					}
				}

				curEntry += 1
			}

			if len(fileEntries) > 0 {
				log.Println("Added " + strconv.Itoa(len(fileEntries)))
				entries = append(entries, fileEntries)
			}

			// check for errors
			if err = scanner.Err(); err != nil {
				log.Fatal(err)
			}
		} else {
			log.Fatal(err)
		}
	}

	flatEntries := make([]*HistoryEntry, total)
	fileBasePos := total
	for curE := 0; curE < len(entries); curE++ {
		e := entries[curE]
		fileBasePos -= len(e)
		for j := 0; j < len(e); j++ {
			flatEntries[fileBasePos + j] = e[j]
		}
	}

	return flatEntries
}