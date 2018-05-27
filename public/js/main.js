$(document).ready(function() {
	getRepo();
});

var getCookieByName = function(name){
	var pair = document.cookie.match(new RegExp(name + '=([^;]+)'));
	return !!pair ? pair[1] : null;
};

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

var getMonthName = function(dateObject) {
	switch(dateObject.getUTCMonth()) {
		case 0:
			return "Jan";
		case 1:
			return "Feb";
		case 2:
			return "Mar";
		case 3:
			return "Apr";
		case 4:
			return "May";
		case 5:
			return "Jun";
		case 6:
			return "Jul";
		case 7:
			return "Aug";
		case 8:
			return "Sep";
		case 9:
			return "Oct";
		case 10:
			return "Nov";
		case 11:
			return "Dec";
	}
}

var getRepo = function() { // TODO - user selects repository through interface
	$.ajax({
	    url: "https://api.github.com/graphql",
	    method: "POST",
	    dataType: "json",
	    contentType: "application/json; charset=utf-8",
	    data: JSON.stringify({ "query": "{ viewer { repositories(last: 1) { repository: nodes { name owner { login } description branch: defaultBranchRef { name commits: target { ... on Commit { history(first: 10) { commit: nodes { oid abbreviatedOid committedDate message tree { entries { oid name } } } } } } } } } } }" }),
	    cache: false,
	    beforeSend: function (xhr) {
	        /* authorization header */
	        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
	    },
	    success: function (data) {
	    	var repo = data['data']['viewer']['repositories']['repository'][0];
	    	var name = repo['name'];
	    	var owner = repo['owner']['login'];
	    	var branch = repo['branch']['name'];
	    	var commit = repo['branch']['commits']['history']['commit'];
	    	var fileName = "README.md"; // TODO - user selects file through interface
	    	var fileOid = "";
	    	var blameOid = commit[0]['oid'];
	    	// find the correct file in commit tree
	    	for(var j = 0; j < commit[0]['tree']['entries'].length; j++) {
	    		if(commit[0]['tree']['entries'][j]['name'] == fileName) {
	    			fileOid = commit[0]['tree']['entries'][j]['oid'];
	    			// TODO - add error handling if no file is found?
	    		}
	    	}
	    	// add basic commit container
	    	var commitContainer = document.createElement('div');
	    	commitContainer.classList.add('commit');
	    	var commitContent = document.createElement('div');
	    	commitContent.classList.add('commit-content');
	    	var commitHeader = document.createElement('div');
	    	commitHeader.classList.add('commit-header');
	    	var committedDate = new Date(commit[0]['committedDate']);
	    	commitHeader.textContent = ("0" + committedDate.getUTCDate()).slice(-2) + " " +
									   getMonthName(committedDate) + " " +
									   committedDate.getUTCFullYear() + " at " +
									   ("0" + committedDate.getUTCHours()).slice(-2) + ":" +
									   ("0" + committedDate.getUTCMinutes()).slice(-2) + ":" +
									   ("0" + committedDate.getUTCSeconds()).slice(-2) + " - " + 
									   commit[0]['message'];
	    	commitContainer.appendChild(commitHeader);
	    	commitContainer.appendChild(commitContent);
	    	$('.container').append(commitContainer);
	    	// add blame blocks inside commit
	    	getBlame(commitContent, name, owner, fileOid, fileName, blameOid);
	    },
	    error: function (jqXHR, textStatus, errorThrown) {
	    	// TODO - show "whoops something went wrong"
	    }
	});
}

var getBlame = function(commitContent, name, owner, fileOid, fileName, blameOid) {
	$.ajax({
	    url: "https://api.github.com/graphql",
	    method: "POST",
	    dataType: "json",
	    contentType: "application/json; charset=utf-8",
	    data: JSON.stringify({ "query": "{ repository(owner: \"" + owner + "\", name: \"" + name + "\") { file: object(expression: \"" + fileOid + "\") { ... on Blob { text } } commit: object(expression: \"" + blameOid + "\") { ... on Commit { blame(path: \"" + fileName + "\") { ranges { startingLine endingLine commit { abbreviatedOid author { user { login name } } } } } } } } }" }),
	    cache: false,
	    beforeSend: function (xhr) {
	        /* authorization header */
	        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
	    },
	    success: function (data) {
	    	var contents = data['data']['repository']['file']['text'].split("\n");
	    	var blame = data['data']['repository']['commit']['blame']['ranges'];
	    	for(var i = 0; i < blame.length; i++) {
	    		var newBlock = document.createElement('div');
	    		newBlock.classList.add('blame-block');
	    		newBlock.classList.add('oid-' + blame[i]['commit']['abbreviatedOid']);
	    		newBlock.classList.add('user-' + blame[i]['commit']['author']['user']['login']);
	    		for (var j = blame[i]['startingLine']; j <= blame[i]['endingLine']; j++) {
	    			var newLine = document.createElement('div');
	    			newLine.classList.add('blame-line');
	    			var lineNumber = document.createElement('div');
	    			lineNumber.classList.add('line-number');
	    			lineNumber.textContent = j;
	    			var lineText = document.createElement('div');
	    			lineText.classList.add('line-text');
	    			if(contents[j-1].length < 1) {
	    				 lineText.innerHTML = "<br>";
	    			} else {
	    				// TODO - fix this expression so it matches multiple ocurrences
	    				lineText.innerHTML = contents[j-1].replace("\t", "&nbsp;&nbsp;&nbsp;&nbsp;").replace("  ", "&nbsp;&nbsp;");
	    			}
	    			newLine.appendChild(lineNumber);
	    			newLine.appendChild(lineText);
	    			newBlock.appendChild(newLine);
				}
				commitContent.appendChild(newBlock);
	    	}
	    },
	    error: function (jqXHR, textStatus, errorThrown) {
	    	// TODO - show "whoops something went wrong"
	    }
	});
}