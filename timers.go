package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"time"
)

type Timer struct {
	Id        int64
	Name      string
	SetTime   time.Duration
	ExpiresAt time.Time
	TimeRemaining time.Duration
	Expired       bool
	Notified bool
}

type Timers []*Timer

var timers = make(Timers, 0)
var nextId = int64(0)

func StartTimerUpdateLoop(s *SousVide) {
	for _ = range time.Tick(time.Second) {
		for _, t := range timers {
			t.TimeRemaining = t.ExpiresAt.Sub(time.Now())
                        wasExpired := t.Expired
			t.Expired = t.TimeRemaining < 0

                        if t.Expired && !wasExpired{
                            s.Enabled = false
                            timers = make(Timers, 0)
                            log.Printf("Job %s completed!", t.Name)
                            break
                        }
		}
	}
}

func (t Timers) Len() int      { return len(t) }
func (t Timers) Swap(i, j int) { t[i], t[j] = t[j], t[i] }

func (t Timers) Less(i, j int) bool {
	return t[i].TimeRemaining < t[j].TimeRemaining
}

func AddTimerHandler(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")
	if name == "" {
		http.Error(w, "missing argument name", http.StatusBadRequest)
		return
	}
	m, err := intData(w, r, "m", 0)
	if err != nil {
		return
	}
        id, idErr := intData(w, r, "id", 0)
	if idErr != nil {
		return
	}
	if m == 0 || m < 0 {
		http.Error(w, "must set timer for time in the future", http.StatusBadRequest)
		return
	}

	t := &Timer{
		Id:   id,
		Name: name,
		SetTime: time.Duration(m)*time.Minute,
	}
	t.ExpiresAt = time.Now().Add(t.SetTime)

	nextId++
	log.Printf("set timer %v\n", t)
	timers = append(timers, t)
	sort.Sort(timers)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func GetTimersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-type", "application/json")
	b, err := json.Marshal(timers)
	if err != nil {
		log.Panicf("could not marshal timer temps to json: %v", err)
	}
	w.Write(b)
	for _, t := range timers {
		t.Notified = t.Expired
	}
}

func DeleteTimerHandler(w http.ResponseWriter, r *http.Request) {
	/*id, err := intData(w, r, "id", -1)
	if err != nil {
		return
	} else if id == -1 {
		http.Error(w, "must specify ID to delete", http.StatusBadRequest)
		return
	}
	idx := -1
	for i, t := range timers {
		if t.Id == id {
			idx = i
			break
		}
	}
	if idx == -1 {
		http.Error(
			w, fmt.Sprintf("could not find ID %d", id), http.StatusBadRequest)
		return
	}
	timers[idx] = timers[len(timers)-1]
	timers = timers[:len(timers)-1]
	sort.Sort(timers)*/
        timers = make(Timers, 0)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
