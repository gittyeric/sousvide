// used to implement a drop-n lowpass filter
var lowpass = 0
var drop = 1

// store an hour of temps for graphing
var n = 60 * 60 / drop;
var temps = new Array(n);
var target = new Array(n);
var heating = new Array(n);
var names = new Array(n);

var HEAT_HEIGHT = 160;

for (var i = 0; i < n; i++) {
    temps[i] = 0;
    target[i] = 0;
    heating[i] = 0;
    names[i] = "";
}

var width, height, x, y;

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d, i) { return x(i); })
    .y(function(d, i) { return y(d); });

var svg, path, targetpath, heatingpath;

function initChart() {
    width = window.innerWidth;
    height = window.innerHeight;

    x = d3.scale.linear()
        .domain([0, n - 1])
        .range([0, width]);

    y = d3.scale.linear()
        .domain([30, 212])
        .range([height, 0]);

    svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

    targetpath = svg.append("g")
        .append("path")
        .datum(target)
        .attr("class", "targetline")
        .attr("d", line);

    heatingpath = svg.append("g")
        .append("path")
        .datum(heating)
        .attr("class", "heatingline")
        .attr("d", line);

    path = svg.append("g")
        .append("path")
        .datum(temps)
        .attr("class", "line")
        .attr("d", line);
}

function pushHistory(history){
    for(var i=0; i < history.length; i++){
        var entry = history[history.length - 1 - i];
        temps[i] = entry.Temp;
        names[i] = entry.JobName;
        target[i] = entry.Target;
        heating[i] = entry.IsHeating ? HEAT_HEIGHT : 0;
    }

    heatingpath
        .attr("d", line)
        .attr("transform", null)
        .transition()
        .duration(1000)
        .ease("linear")
        .attr("transform", "translate(" + x(-1) + ",0)")
    path
        .attr("d", line)
        .attr("transform", null)
        .transition()
        .duration(1000)
        .ease("linear")
        .attr("transform", "translate(" + x(-1) + ",0)")
    targetpath.transition().duration(1000).attr("d", line);
}
