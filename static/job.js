function newJobs(){
    var ALERT_INTERVAL_SECS = 10;
    
    var LOCAL_OFFSET = 1000000;
    
    var jobs = {};
    var maxJobId = 1;
    
    var $jobManager = $("#manage_job");
    var $jobSelect = $("#start_jobs").find("select");
    
    /*$.ajax("/get_jobs").done(function(temps){
        for(var i=0; i < temps.length; i++){
            job = temps[i];
            job.localId = LOCAL_OFFSET + job.id;
            maxJobId = Math.max(maxJobId, job.id);
            jobs[job.localId+""] = job;
        }
        updateJobsSelect();
    });*/
    
    function cancelRemoteTimers(){
        $.ajax("/delete_timer").fail(function(){
            alert("Failed to cancel timer, please check sousvide status.");
        });
    }
    
    function setRemoteTimer(job){
        $.ajax("/timer", {
            data: {
                m : job.minutes,
                name: job.name,
                id: job.id
            },
            dataType: "text"
        }).fail(function(){
            alert("Failed to cancel timer, please check sousvide status.");
        });
    }
    
    function deleteRemoteJob(){
        //TODO
    }
    
    function newRemoteJob(job){
        //TODO
    }
    
    function saveNewJob(){
        var $jobForm = $("#new_job");
        
        maxJobId++;
        var job = {
            id : maxJobId,
            localId: maxJobId + LOCAL_OFFSET,
            name : $("#job_name").val(),
            temp : Number($("#job_temp").val()),
            minutes : Number($("#job_minutes").val())
        };

        if(job.name.indexOf("~") >= 0){
            alert("Jobs cannot contain '~'");
            return false;
        }
        
        //TODO
        /*$.ajax("/add_job", {
            temps: {
                "name" : job.name,
                "temp" : job.temp,
                "m" : job.minutes,
            },
            dataType: 'text'
        }).fail(function(){
            alert("Could not save job to sousvide, the job will be gone if the page is refreshed.");
        });*/
        
        jobs[job.localId+""] = job;
        updateJobsSelect();

        return true;
    }
    
    function updateJobsSelect(){
        $jobSelect.html("<option val='0'>Pick Job to Start</option");
        
        for(var key in jobs){
            var job = jobs[key];
            console.log("appending id: " + job.localId);
            $jobSelect.append("<option val='" + job.localId + "'>" + job.name + "</option>");
        }
    }
    
    function getCurrentJob(){
        curLocalJobId = $("#job_select option:selected").attr("val");
        if(curLocalJobId === "0"){
            console.log("Null Job?");
            return null;
        }
        console.log("getting job: " + curLocalJobId);
        return jobs[curLocalJobId];
    }
    
    function setPreheat(job){
        $("#target_input").val(job.temp+"");
        $("#param_form").submit();
        
        $("#preheat").css("height", "0");
        $("#preheating").css("height", "auto");
        $("#preheating span").text(job.temp);

        listenForTemp(job.temp);
    }
    
    var TIMER_TEMP_ALLOWANCE = 1;
    var listeningTemp = 0;
    var tempHandler = function(temp){
        if(temp >= (listeningTemp-TIMER_TEMP_ALLOWANCE)){
            $("#preheating").css("height", "0");
            $("#start_timer").css("height", "auto");
            $("#start_timer span").text(getCurrentJob().minutes);
            playAlert();
            unlistenForTemp();
        }
    };
    function listenForTemp(temp){
        if(listeningTemp > 0){
            unlistenForTemp();
        }
        
        listeningTemp = temp;
        tempDispatcher.on("temp", tempHandler);
    }
    function unlistenForTemp(){
        listeningTemp = 0;
        tempDispatcher.off("temp", tempHandler);
    }
    
    function setPreheatToCurrentJob(){
        setPreheat(getCurrentJob());
    }
    
    function setTimerToCurrentJob(){
        job = getCurrentJob();
        startTimer(job.minutes*60*1000);
    }
    
    function resetJobsUI(){
        $jobManager.find("div").css("height", "0");
        $("#preheat").css("height", "auto");
        $jobManager.css("height", "0");
        $("#new_job").css("height", "0");
        $("#start_jobs").css("height", "auto");
        cancelTimer();
        unlistenForTemp();
    }
    
    var timerStart = 0;
    var timerRef = 0;
    var timerComplete = false;
    function startTimer(jobTimeMs){
        cancelTimer();
        timerStart = (new Date()).getTime();
        
        $("#start_timer").css("height", "0");
        $("#cooking").css("height", "auto");
        
        var timerEnd = timerStart + jobTimeMs;
        timerRef = setInterval(function(){
             var curTime = (new Date()).getTime();
             var timeDiff = Math.abs(timerEnd - curTime);
             var secs = Math.round(timeDiff/1000)%60+"";
             var mins = Math.floor(timeDiff/(1000*60))%60+"";
             var hrs = Math.floor(timeDiff/(1000*60*60))+"";
             
             if(secs.length < 2) secs = "0" + secs;
             if(mins.length < 2) mins = "0" + mins;
             if(hrs.length < 2) hrs = "0" + hrs;
             
             var timeStr = hrs + ":" + mins + ":" + secs;
             $("#cooking span, #cooked span").text(timeStr);
             
             if(timerEnd <= curTime){
                 completeTimer();
                 if(!timerComplete){
                     completeTimer();
                 }
                 else if(secs%ALERT_INTERVAL_SECS === 0){
                     playAlert();
                 }
             }
             
        }, 1000);
    }
    function cancelTimer(){
        if(timerStart !== 0){
            clearInterval(timerRef);
        }
        timerStart = 0;
        timerComplete = false;
    }
    function completeTimer(){
        if(!timerComplete){
            $("#cooking").css("height", "0");
            $("#cooked").css("height", "auto");
            
            if($("#cooking input").is(":checked")){
                $.ajax({
                    url: "/disable",
                    type: 'post',
                    dataType: "text",
                    success: function(){
                        $(".heat_off").css("display", "none");
                    }
                });
            }
            else{
                $(".heat_off").css("display", "inline");
            }
            
            playAlert();
            timerComplete = true;
        }
    }
    function playAlert(){
        $("#timernoise").get(0).play();
    }
    
    //Job Picker
    $("#job_select").change(function(){
        var job = getCurrentJob();
        if(job !== null){
            $("#start_jobs").css("height", "0");
            $("#manage_job").css("height", "auto");
            
            $("#preheat span").text(job.temp + "");
            $("#manage_job h3").text(job.name);

            $.ajax({
                url: "/job",
                type: 'post',
                dataType: "text",
                data: {name : job.name}
            }).fail(function(){
                alert("Failed to set job name in logs! Check connection and ry reselecting this Job.");
            });
        }
    });
    $("#start_jobs button").click(function(){
        startNewJobUI();
    });
    function startNewJobUI(){
        $("#start_jobs").css("height", "0");
        $("#new_job").css("height", "auto");
    }
    
    //New Jobs
    $("#new_job button.save").click(function(){
        if(saveNewJob()){
            resetJobsUI();
        }

        return false;
    });
    
    //Job Management
    //0: Deleting
    $("#preheat button.delete").click(function(){
        res = confirm("Really delete this job?");
        if (res){
            var job = getCurrentJob();
            delete jobs[job.localId+""];
            deleteRemoteJob(job.id);
            updateJobsSelect();
            resetJobsUI();
        }
    });
    
    //1: Preheating
    $("button.preheat").click(setPreheatToCurrentJob);
    attachRequest($("button.preheat").get(0), "/enable", function (data) {return true;});
    
    //2: Start Timer
    $("button.start_timer").click(setTimerToCurrentJob);
    
    //3: Cooking
    //4: Cooked
    attachRequest($(".heat_off").get(0), "/disable", function (data) {
        $(".heat_off").css("display", "none");
        cancelTimer();
        return true;
    });
    $(".job_done").click(resetJobsUI);
    $("#cooked button.restart").click(function(){
        resetJobsUI();
        $("#cooked").css("height", "0");
        $("#preheat").css("height", "auto");
        $("#start_jobs").css("height", "0");
        $("#manage_job").css("height", "auto");
    });
    
    //Cancel handling
    attachRequest($("#cooking button.cancel").get(0), "/disable", function (data) {return true;});
    attachRequest($("#preheating button.cancel").get(0), "/disable", function (data) {return true;});
    
    $("#cooking button.cancel, #cooked button.cancel").click(resetJobsUI);
    $("#manage_job div button.cancel").click(resetJobsUI);
    $("#new_job button.cancel").click(resetJobsUI);
    
    return jobs;
}

var JOBS = {};
function initJobs(){
    JOBS = newJobs();
}