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
	timeStr := strconv.FormatInt(he.Time, 64)
	tempStr := strconv.FormatFloat(he.Temp, 'f', -1, 64)
	targetStr := strconv.FormatFloat(he.Target, 'f', -1, 64)
	isHeating := "0"
	if he.IsHeating{
		isHeating = "1"
	}
	return he.JobName + "~" + timeStr + "~" + tempStr + "~" + targetStr + "~" + isHeating
}

func fromString(hEntryStr string) *HistoryEntry{
	subs := strings.Split(hEntryStr, "~")

	jobName := ""
	time := subs[0]
	temp := subs[1]
	target := subs[2]
	isHeating := subs[3]

	if(len(subs) >= 5){
		jobName = subs[0]
		time = subs[1]
		temp = subs[2]
		target = subs[3]
		isHeating = subs[4]
	}

	timeInt, _ := strconv.ParseInt(time, 10, 64)
	tempFloat, _ := strconv.ParseFloat(temp, 64)
	targetFloat, _ := strconv.ParseFloat(target, 64)
	heatingBool := isHeating == "1"

	return &HistoryEntry{
		JobName: jobName,
		Time: timeInt,
		Temp: tempFloat,
		Target: targetFloat,
		IsHeating: heatingBool,
	}
}

type ByModTime []os.FileInfo

func (fis ByModTime) Len() int {
	return len(fis)
}

func (fis ByModTime) Swap(i, j int) {
	fis[i], fis[j] = fis[j], fis[i]
}

func (fis ByModTime) Less(i, j int) bool {
	return fis[i].ModTime().Before(fis[j].ModTime())
}

type HistoryResponse struct {
	History []*HistoryEntry
	HasPrev bool
	Page int
}

func dumpHistoryJson(w http.ResponseWriter, page int, history []*HistoryEntry) {
	w.Header().Set("Content-type", "application/json")

	historyResponse := &HistoryResponse{
		History: history,
		HasPrev: len(history) == RESULTS_PER_PAGE,
		Page: page,
	}

	b, err := json.Marshal(historyResponse)
	if err != nil {
		log.Panicf("could not marshal historical temps to json: %v", err)
	}
	w.Write(b)
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

	entries := make([]*HistoryEntry, 0, RESULTS_PER_PAGE)

	f, _ := os.Open("/var/log/sousvide/therm")
	fis, _ := f.Readdir(-1)
	f.Close()
	sort.Sort(ByModTime(fis))

	for _, fi := range fis {
		if curEntry < lastEntry {
			break
		}

		log.Output(2, "Inspecting history file: " + fi.Name())

		if file, err := os.Open(fi.Name()); err == nil {

			// make sure it gets closed
			defer file.Close()

			// create a new scanner and read the file line by line
			scanner := bufio.NewScanner(file)
			for scanner.Scan() && curEntry < lastEntry {
				line := scanner.Text()

				if(curEntry >= firstEntry){
					hEntry := fromString(line)
					entries = append(entries, hEntry)
				}

				curEntry += 1
			}

			// check for errors
			if err = scanner.Err(); err != nil {
				log.Fatal(err)
			}

		} else {
			log.Fatal(err)
		}
	}

	return entries
}