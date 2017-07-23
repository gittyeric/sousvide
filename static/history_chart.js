function initChart() {
    //paint();
}

var history = [];
function pushHistory(allHistory){
    history = allHistory;
    paint(allHistory);
}

function paint(history){
    d3.select("svg").remove(); //Remove current if any

    /*var svg = d3.select("body").append("svg").attr("width", window.innerWidth*0.8).attr("height", window.innerHeight*0.8),
        margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");*/

    innerPaint(history)
}

function innerPaint(history){
    var data = [];
    for(var i=0; i < history.length; i++){
        data[i] = {
            date : new Date(Number(history[i].Time)),
            temp : history[i].Temp,
            isOn : history[i].IsHeating ? 1 : 0,
            group: 100*i
        };
    }

    var margin = {top: 30, right: 20, bottom: 35, left: 50},
        width = window.innerWidth*0.8 - margin.left - margin.right,
        height = window.innerHeight*0.8 - margin.top - margin.bottom;

    var color = d3.scale.ordinal()
        .domain([0, 1])
        .range(['steelblue', 'rgb(254, 79, 0)']);

    var x = d3.time.scale()
        .rangeRound([0, width]);

    x.domain(d3.extent(data, function(d) { return d.date; }));
    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(8);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(10);

    var area = d3.svg.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.temp); });

    var svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

// function for the y grid lines
    function make_x_axis() {
        return d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(5)
    }
    function make_y_axis() {
        return d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5)
    }

        var dataGroup = d3.nest()
            .key(function(d) {
                return d.group;
            })
            .entries(data);

        dataGroup.forEach(function(group, i) {
            if(i < dataGroup.length - 1) {
                group.values.push(dataGroup[i+1].values[0])
            }
        })

        // Scale the range of the data
        y.domain([30, d3.max(data, function(d) { return d.temp; })]);

        dataGroup.forEach(function(d, i){
            svg.append("path")
                .datum(d.values)
                .attr("class", "area")
                .attr("d", area);
        });

        svg.selectAll(".area")
            .style("fill", function(d) { return color(d[0].isOn); });

        // Draw the x Grid lines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(make_x_axis()
                .tickSize(-height, 0, 0)
                .tickFormat("")
            )

        // Draw the y Grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(make_y_axis()
                .tickSize(-width, 0, 0)
                .tickFormat("")
            )

        // Add the X Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add the Y Axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        //Find all Job Name changes and display them
        lastName = null;
        isEven = true;
        for(var i=0; i < history.length; i++){
            if(history[i].JobName != lastName){
                lastName = history[i].JobName;
                var displayName = lastName.length > 1 ? lastName : "(No Job)";
                var y = height-margin.bottom;
                if(isEven){
                    y += margin.bottom - 10;
                }

                svg.append("text")
                    .attr("transform",
                        "translate(" + (width * (i / history.length) ) + " ," +
                        y + ")")
                    .style("text-anchor", "middle")
                    .text(displayName);

                isEven = !isEven;
            }
        }

        // Add the text label for the Y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("x", margin.top - (height / 2))
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("");

        // Add the title
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text("Temp History");

}
