// store an hour of temps for graphing
var n = 60 * 60;
var times = new Array(n);
var temps = new Array(n);
var target = new Array(n);
var heating = new Array(n);
var names = new Array(n);

var HEAT_HEIGHT = 160;

for (var i = 0; i < n; i++) {
    times[i] = new Date();
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

var svg, tempSvg, path, targetpath, heatingpath, dateX, dAxis;

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

    drawTimes();
}

function drawTimes(){
    if(tempSvg){
        tempSvg.remove();
    }

    var xDate = d3.time.scale().range([0, width]);
    xDate.domain(d3.extent(times, function(t) {return t; }));

    dAxis = d3.svg.axis()
        .scale(xDate)
        //.ticks(d3.time.hour, 1)
        .orient("top");

    tempSvg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

    dateX = tempSvg.append("g")
        .attr("transform", "translate(0," + 100 + ")");
    dateX.call(dAxis);

    var yDomain = d3.extent(temps, function(d) { return d; });
    var yScale = d3.scale.linear()
        .domain(yDomain).nice()   // make axis end in round number
        .range([0, 200]);   // map these to the chart height, less padding.  In this case 300 and 100

    // define the y axis
    var yAxis = d3.svg.axis()
        .orient("right")
        .scale(yScale);

    tempSvg.append("g")
        //.attr("transform", "translate(0," + 200 + ")")
        .call(yAxis);
}

function pushHistory(history){
    for(var i=0; i < history.length; i++){
        var entry = history[i];
        temps[i] = entry.Temp;
        names[i] = entry.JobName;
        target[i] = entry.Target;
        heating[i] = entry.IsHeating ? HEAT_HEIGHT : 0;
        times[i] = new Date(Number(entry.Time));
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
    drawTimes();
}
