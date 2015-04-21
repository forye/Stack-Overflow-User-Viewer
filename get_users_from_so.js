///////////////////////////////////////////
// DOM elements
var content = $('.content'),
    input   = $('input'),
    chartElm   = $('#chart');




///////////////////////////////////////////
// Events binding
input.on('keydown', function (e){
    if (e.keyCode == 13){
		console.log("got search term: ", this.value +"--");
        searchUsers(this.value);
	}
});

content.on('click', '.userItem', userClick);



///////////////////////////////////////////
// Searches for users in stackoverflow
function searchUsers(name)
{
	// cleanup
    content.html('fetching...');

    $.ajax({
        dataType : 'jsonp',
        jsonp    : 'jsonp',
        url      : "https://api.stackexchange.com/2.2/users?order=desc&sort=reputation&inname=" + name + "&site=stackoverflow",
        success  : function (data){
            content.empty();

            if( data.error_message ){
            	content.addClass('error').text( data.error_message );
            }
            else{
            	content.removeClass('error');
            	displayUsers(data);
            }
        },
        error : function (data){
        	content.addClass('error').html('Error. something went wrong'); // print an error
            console.warn('searchUsers - error - ', data);
        }
    });
}

///////////////////////////////////////////
// Print a list of users
function displayUsers(data)
{
	console.log('displayUsers: ', data.items.length, ' -- ', data);

	if (!data || !data.items || !data.items.length) { // catches: null 0 undefined
		console.warn('empy data on on input', data);
		return;
	}

	data.items.forEach(function (item){
		var location = item.location ? item.location : '';

		var userElm = '<div class="userItem" id="'+ item.user_id +'"> \
                          <img src="'+ item.profile_image +'"> \
                          <div class="details"> \
                               <span class="name">'+ item.display_name +'</span> \
							   <span class="from">' + location +'</span> \
							   <span class="reputation">reputation:' + item.reputation +'</span> \
                          </div> \
                       </div>';

		content.append(userElm);
	});
}

//content.hover(if (typeof(this)==img) HandleImageHover(this));

//TODO  1. change getUserTags() to userDetalsPlotter()


//TODO  2. User Timeline: for reputation- per month window (30 days summation) plot the user reputation change. mark the corrent reputation at each point.

//todo  3. geo distributions of tags of other dataType

//TODO 4. sum tags of answered questions (answer tags)
//todo 5. sum tags of asked questions (learend tags)

// todo 6.  connection plot of tags- by Tags.Sort(relevence= SumOfConnections or ContextDistance)

//??(what)?


function userClick(e)
{
	"use strict";

	console.log("user selected: ", this.id);

	var graphData = {
			activity : {
				key : 'activity',
				bar : true,
				color : '#f66'
			},
			reputation : {
				key : 'reputation',
				color : '#6cf'
			}
		},

		userID                 = this.id,

		activities             = {},
		activitiesData         = [],
		RepHistory             = {},
		RepHistoryData         = [],
		getUserActivityCounter = 1,
		getUserRepCounter      = 1,

		getUserRepCounter      = 1,

		maxRepPages 		   = 2, // 10
		maxActivityPages 	   = 2; // 10

	//var RepHistory = getUserRep(img);
	//console.info("has " +RepHistory.length +" rep changes in history" );
	//getUserTags(img);


	// make sure there is a userID...
	if( !userID ){
		return false;
		console.warn('no userID');
	}

	// mark the chosen user item and unmark any other marked ones from before (if there were)
	$(this).addClass('active').siblings('.active').removeClass('active');

	// get reputation data
	for (var i=1 ; i<= maxRepPages; i++){
		getUserRep(this.id, i)
			//.then(preDone)
			.done(getUserRep_Done)
			.fail(function(data){
			console.warn('error', data);
		})
			.always(function(){ getUserRepCounter++; })
	}

    // get activity data
	for(var i=1; i <= maxActivityPages; i++){
		getUserActivity(this.id, i)
		   // .then(preDone)
			.done(getUserActivity_Done)
			.fail(function(data){
				console.warn('error', data);
			})
			.always(function(){ getUserActivityCounter++; })
	}

    /// {"error_id":502,"error_message":"too many requests from this IP, more requests available in 76761 seconds","error_name":"throttle_violation"});

	function preDone(data){
		console.log(data);
		return false;
	}


	function getUserRep_Done(data){
		data.items.forEach(function(item){
			var date = new Date(item.creation_date *1000),
				monthNum = date.getMonth(),
				year = date.getFullYear(),
				monthTimeStamp = new Date(year,monthNum,1).getTime();

			// console.log("getUserRep_Done", item.creation_date, year);

			if( !RepHistory[monthTimeStamp] )
				RepHistory[monthTimeStamp] = item.reputation_change;
			else
				RepHistory[monthTimeStamp] += item.reputation_change;
		});

		if( getUserRepCounter == maxRepPages ){
			for( var date in RepHistory )
				if( RepHistory.hasOwnProperty(date) )
					RepHistoryData.push({x:date*1, y:RepHistory[date]});
					//RepHistoryData.push([date, RepHistory[date]]);
					//new Date(1428999449000).getTime()
			graphData.reputation.values = RepHistoryData;

		}

		send2D3();
	}

	function getUserActivity_Done(data){
		data.items.forEach(function(item){
			var date 		   = new Date(item.creation_date * 1000),
			    monthNum       = date.getMonth(),
			    year 	       = date.getFullYear(),
			    monthTimeStamp = new Date(year,monthNum,1).getTime();

			// console.log("getUserActivity_Done", item.creation_date, year);

			if( !activities[monthTimeStamp] )
				activities[monthTimeStamp] = 1;
			else
				activities[monthTimeStamp] += 1;
		});

		if( getUserActivityCounter == maxActivityPages ){
			for( var date in activities )
				if( activities.hasOwnProperty(date) ){
					activitiesData.push({x:date*1, y:activities[date]});
				}

			graphData.activity.values = activitiesData;

			// graphData.reputation.values = activitiesData;
		}

		send2D3();
	}


	// prints the graph once all the data has been collected
	function send2D3(){
		console.log('send2D3');
		if( graphData.activity.values && graphData.reputation.values ){
			console.log(graphData);
			// content.empty();
			printGraph([graphData.activity, graphData.reputation]);
		}
	}
}


function getUserActivity(userID, page){
    return $.ajax(
        {
            dataType: 'jsonp',
			//contentType:"text/html; charset=utf-8",
            jsonp: 'jsonp',
			url : 'https://api.stackexchange.com/2.2/users/'+ userID +'/network-activity?pagesize=100&page='+ page
		}
    );
}

function getUserRep(userID, page){
	return $.ajax(
		{
			dataType: 'jsonp',
			//contentType:"text/html; charset=utf-8",
			jsonp: 'jsonp',
			url: "https://api.stackexchange.com/2.2/users/" + userID + "/reputation-history?page="+page+"&site=stackoverflow"
		}
	);
}


function getUserTags() {
	var userid = this.id,
		tags = [];

	$.ajax(
		{
			dataType: 'jsonp',
			jsonp: 'jsonp',
			url: "https://api.stackexchange.com/2.2/users/" + userid + "/tags?site=stackoverflow",
			success: function (data) {
				content.empty();
				console.log('tags-succes', data);
				for (var item in data.items) {
					var a = {};
					a[data.items[item].name] = data.items[item].count;
					tags.push(a);
					console.log( data);
				}
			},

			error: function () {
				console.warn('error in tags');
			}
		});
}

///////// demo graph
printGraph([{"key":"activity","bar":true,"color":"#f66","values":[{"x":1404162000000,"y":1},{"x":1285880400000,"y":1},{"x":1264975200000,"y":2}]},{"key":"reputation","color":"#6cf","values":[{"x":1427835600000,"y":326},{"x":1425160800000,"y":487},{"x":1422741600000,"y":474},{"x":1420063200000,"y":332},{"x":1417384800000,"y":437},{"x":1414792800000,"y":530},{"x":1412110800000,"y":363},{"x":1409518800000,"y":461},{"x":1406840400000,"y":470}]}]);

function printGraph(data){
	nv.addGraph(function(){
		console.log('D3 graph data: ',JSON.stringify(data));

		chart = nv.models.linePlusBarChart()
           // .margin({top: 0, right: 0, bottom: 0, left: 0})

        chart.xAxis.tickFormat(function(d) {
                return d3.time.format('%x')(new Date(d))
            })
            .showMaxMin(false);

       // chart.y1Axis.tickFormat(function(d) { return '$' + d3.format(',f')(d) });
      //  chart.bars.forceY([0]).padData(false);

        chart.focusEnable(false);
	    chartElm.html('<svg>'); // I added this to clean the last graph and create an empty <SVG> element inside the chart div

        chart.x2Axis.tickFormat(function(d) {
            return d3.time.format('%x')(new Date(d))
        }).showMaxMin(false);

        d3.select('#chart svg')
            .datum(data)
            .transition().duration(500).call(chart);

        nv.utils.windowResize(chart.update);

        chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });

        return chart;
	});
}




/*
function getUserRepOld(userID, page) {
	console.log('Reputation');
	return $.ajax(
		{
			dataType: 'json',
			contentType:"application/json; charset=utf-8",
			jsonp: 'jsonp',
			url: "https://api.stackexchange.com/2.2/users/" + userID + "/reputation-history?page="+page+"&site=stackoverflow",
			success: function (data ,userID) {
				content.empty();
				//console.log('rep-succes '+ data.items[0].reputation_change+ " long");
				console.log("data");

				for (var item in data.items) {
					var a = {};
					console.log('idle= ');

					a[data.items[item].creation_date] = data.items[item].reputation_change;
					RepHistory.push(a);
					console.log('idle= ');
				}

				// now show in graph
				//if (RepHistory.length)
					//printTagsGraph(RepHistory);
			},

			error: function () {
				console.warn('error in rep');
			}
		});
}
*/



/*

// D3 stuff
function printTagsGraph(tags) {
    console.log('D3-tag', tags);
}

function printReputationGraph(items)
{
	var chart = c3.generate({
		data: {
			x: 'x',
			//        xFormat: '%Y%m%d', // 'xFormat' can be used as custom format of 'x'
			columns: [
				['x', '2013-01-01', '2013-01-02', '2013-01-03', '2013-01-04', '2013-01-05', '2013-01-06'],
				//            ['x', '20130101', '20130102', '20130103', '20130104', '20130105', '20130106'],
				['data1', 30, 200, 100, 400, 150, 250],
				['data2', 130, 340, 200, 500, 250, 350]
			]
		},
		axis: {
			x: {
				type: 'timeseries',
				tick: {
					format: '%Y-%m-%d'
				}
			}
		}
	});

	setTimeout(function () {
		chart.load({
			columns: [
				['data3', 400, 500, 450, 700, 600, 500]
			]
		});
	}, 1000);

}


*/