(function(){
	var inputData = [[], []];
	var graphData = [[],[]];
	var plotNum = 21; // has to be odd num
	var μ = (plotNum - 1) / 2;
	var varianceMs = 30; // millisec
	var plotInterval = varianceMs * 2 / (plotNum - 1);
	var gaussian = [];
	var security = 0.05;

	var margin = {top: 10, right: 10, bottom: 20, left: 100},
		width = 600 - margin.left - margin.right,
		height = 300 - margin.top - margin.bottom;


	var pushInputData = function(event){
		var ed = event.data;
		var input = {"date": new Date(), "key": event.which}
		var dataLength = inputData[ed.id].length;
		var prevInput = inputData[ed.id][dataLength - 1];
		var diff = (dataLength > 0) ? input.date.getTime() - prevInput.date.getTime() + "ms" : "";
		inputData[ed.id].push(input);
		var newItem = $("<option>").attr("value", input.date).append(input.date + " " + input.key + " " + diff);
		$("#rhythmListBox" + ed.id).append(newItem);
	};

	var drawRhythmGraph = function(event){
		var ed = event.data;
		if(inputData[ed.id].length == 0) return;
		if(gaussian.length == 0){
			var σ = varianceMs / 3; // 3 is 0.9974 confidence interval of Normal Distribution
			var σ2 = σ * σ;
			for(var i = 0; i < plotNum; i++){
				gaussian.push( σ2 * Math.exp(- Math.pow( varianceMs * (i - μ) / μ, 2)/ (2 * σ2)) );
			}
		}
		var gd = [];
		var rowData = inputData[ed.id];
		var firstTime = 0;
		for(var i = 0; i < rowData.length; i++){
			var d = rowData[i];
			if(i == 0){
				firstTime = d.date.getTime();
			}else if(i > 0){
			// have to fill with zero between data
				var prevTime = gd[gd.length - 1].x.getTime();
				var postTime = d.date.getTime() - varianceMs - firstTime;
				for(prevTime += plotInterval; prevTime < postTime; prevTime += plotInterval){
					gd.push({"x": new Date(prevTime), "y": 0});
				}
			}
			for(var j = 0; j < plotNum; j++){
				gd.push({"x": new Date(d.date.getTime() - firstTime + varianceMs * (j - μ) / μ), "y": gaussian[j]});
			}
		}
		var x = d3.time.scale().range([0, width]).domain([gd[0].x, gd[gd.length - 1].x]),
			y = d3.scale.linear().range([height, 0]).domain([0, 100]);
		graphData[ed.id] = gd;
		drawLineGraph(gd, x, y, "#rhythmGraphDiv" + ed.id);
	};
	var cl = d3.scale.category10().range();
	var clIdx = 0;
	var drawLineGraph = function(arr, x, y, div_id){
			//x = d3.time.scale().range([0, width]).domain(d3.extent(inputData, function(d){ return d.date; })),
			// x = d3.time.scale().range([0, width]).domain([arr[0].date, arr[arr.length - 1].date]),
			// y = d3.scale.linear().range([height, 0]).domain([0, 100]),
		var xAxis = d3.svg.axis().scale(x).orient("bottom"),
			yAxis = d3.svg.axis().scale(y).orient("left"),
			line = d3.svg.line()
					.x(function(d) { return x(d.x); })
					.y(function(d) { return y(d.y); });
		d3.select(div_id).select("svg").remove();
		var svg = d3.select(div_id).append("svg")
			// .attr("id", "svg_rhythmGraph")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Rhythm Pulse");
		svg.append("path")
			.datum(arr)
			.attr("class", "line")
			.attr("d", line)
			.style({"fill":"none","stroke":cl[clIdx++ % 10]});
	};

	var clearRhythm = function(event){
		var ed = event.data;
		inputData[ed.id] = [];
		graphData[ed.id] = [];
		$("#lockRhythmInput" + ed.id).val("");
		$("#rhythmListBox" + ed.id).empty();
		$("#rhythmGraphDiv" + ed.id).children().remove();
	};

	var convoluteRhythms = function(){
		var convArr = convolution(	$.map(graphData[0], function(elm){return elm.y;}), 
									$.map(graphData[1], function(elm){return elm.y;})),
			selfConvArr = convolution(	$.map(graphData[0], function(elm){return elm.y;}), 
										$.map(graphData[0], function(elm){return elm.y;}))
			x = d3.scale.linear().range([0, width]).domain([0, convArr.length - 1]),
			y = d3.scale.linear().range([height, 0]).domain([0, Math.max.apply(null, convArr)]);
		var selfGD = $.map(selfConvArr, function(elm, idx){ return {"x":idx, "y":elm}; }); 
		var convGD = $.map(convArr, function(elm, idx){ return {"x":idx, "y":elm}; });
		drawLineGraph(selfGD, x, y, "#selfConvGraphDiv");
		drawLineGraph(convGD, x, y, "#convGraphDiv");
		var selfMax = Math.max.apply(null, selfConvArr);
		var convMax = Math.max.apply(null, convArr);

		var racio = selfMax/convMax;
		$("#valueSpan").html(racio);
	};
	var createInitializedArray = function(val, length){
		var arr = [];
		for (var i = length - 1; i >= 0; i--) arr.push(val);
		return arr;
	};
	var convolution = function(arr0, arr1){
		if(arr0.length == 0 || arr1.length == 0) return;
		var convArr = createInitializedArray(0, arr0.length + arr1.length - 1);
		for(var i = 0; i < arr0.length; i++){
			for (var j = (arr1.length - 1); j >= 0; j--) {
				convArr[i + (arr1.length - 1) - j] += arr0[i] * arr1[j];
			}
		}
		return convArr;
	};

	var dynamicTimeWarping = function(rhythmArr0, rhythmArr1){
		if(rhythmArr0.length != rhythmArr1.length) return;
		var dtwArr = [];
		for(var i = 0; i < rhythmArr0.length; i++){
			dtwArr.push([]);
			for (var j = 0; j < rhythmArr1.length; j++) {
				dtwArr[i].push(rhythmArr0[i] - rhythmArr1[j]);
			};
		};
	};

	var rhythmTotalDiff = function(rhythmArr0, rhythmArr1){
		var totalDiff = 0;
		if(rhythmArr0.length != rhythmArr1.length) return false;
		for (var i = 0; i < rhythmArr0.length; i++) {
			var rhythmDate0 = rhythmArr0[i].date.getTime() - rhythmArr0[0].date.getTime();
			var rhythmDate1 = rhythmArr1[i].date.getTime() - rhythmArr1[0].date.getTime();
			totalDiff += Math.abs(rhythmDate0 - rhythmDate1);
		};
		$("#valueSpan").html(totalDiff + "ms");
		return totalDiff < 500;
	}
	var validate = function(){
		if(rhythmTotalDiff(inputData[0], inputData[1])){
			$("#lockStatusSpan").html("Open").css("color", "green");
		}else{
			$("#lockStatusSpan").html("Locked").css("color", "red");
		}
	}
	$(document).ready(function(){
		var eventData0 = {"id":0};
		$("#lockRhythmInput0").keydown(eventData0, pushInputData);
		$("#showRhythmButton0").click(eventData0, drawRhythmGraph);
		$("#clearRhythmButton0").click(eventData0, clearRhythm);
		var eventData1 = {"id":1};
		$("#lockRhythmInput1").keydown(eventData1, pushInputData);
		$("#showRhythmButton1").click(eventData1, drawRhythmGraph);
		$("#clearRhythmButton1").click(eventData1, clearRhythm);

		$("#convoluteButton").click(convoluteRhythms);
		$("#validateButton").click(validate);
	});
})();

