/**
 * Created by Burt on 7/13/2017.
 */

var HISTORY_PAGE = 0;
var HAS_PREV = true;

function fetchPage(newPage){
    var data = {page : newPage};

    $.ajax({
        url : "/history",
        data : data,
        dataType : "json",
        method : "POST"
    }).done(handleHistory)
        .fail(function(){
            alert("Please check your internet or the Pi and try again");
        });

    return false;
}

function prevClicked(){
    var newPage = HISTORY_PAGE + 1;
    return fetchPage(newPage);
}

function nextClicked(){
    var newPage = Math.max(HISTORY_PAGE - 1, 0);
    return fetchPage(newPage);
}

function initButtons(){
    refreshButtons();
    $("#prev").click(prevClicked);
    $("#next").click(nextClicked);
}

function refreshButtons(){
    if( HISTORY_PAGE > 0 ){
        $("#next").removeAttr("disabled");
    }
    else{
        $("#next").attr("disabled", "disabled");
    }
    if( HAS_PREV ){
        $("#prev").removeAttr("disabled");
    }
    else{
        $("#prev").attr("disabled", "disabled");
    }
}

function handleHistory(data){
    HISTORY_PAGE = data.Page;
    HAS_PREV = data.HasPrev;
    refreshButtons();

    displayData(data.History);
}

function displayData(history){
    pushHistory(history);
}

$(document).ready(function(){
    initButtons();
    initChart();
    fetchPage(0);
});