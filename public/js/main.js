$(document).ready(function() {
	if(getUrlParameter("owner") != null) {
		$('#input-owner').val(getUrlParameter("owner"));
	}
	if(getUrlParameter("name") != null) {
		$('#input-name').val(getUrlParameter("name"));
	}
	if(getUrlParameter("file") != null) {
		$('#input-file').val(getUrlParameter("file"));
	}
	getRepo();
});

var getCookieByName = function(name){
	var pair = document.cookie.match(new RegExp(name + '=([^;]+)'));
	return !!pair ? pair[1] : null;
};

var getUrlParameter = function(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

var getMonthName = function(dateObject) {
	switch(dateObject.getMonth()) {
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

var getRepo = function() {
	if(getUrlParameter("owner") != null) {
		var owner = getUrlParameter("owner");
	} else {
		var owner = "ogilliland";
	}
	if(getUrlParameter("name") != null) {
		var name = getUrlParameter("name");
	} else {
		var name = "repo-story";
	}
	var query = JSON.stringify({ "query": "{ repository(owner: \"" + owner + "\", name: \"" + name + "\") { name owner { login } description branch: defaultBranchRef { name commits: target { ... on Commit { history(first: 10) { commit: nodes { oid abbreviatedOid committedDate message tree { entries { oid name } } } } } } } } }" });
	$.ajax({
	    url: "https://api.github.com/graphql",
	    method: "POST",
	    dataType: "json",
	    contentType: "application/json; charset=utf-8",
	    data: query,
	    cache: false,
	    beforeSend: function (xhr) {
	        /* authorization header */
	        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
	    },
	    success: function (data) {
	    	var repo = data['data']['repository'];
	    	// var name = repo['name'];
	    	// var owner = repo['owner']['login'];
	    	var branch = repo['branch']['name'];
	    	var commit = repo['branch']['commits']['history']['commit'];
	    	if(getUrlParameter("file") != null) {
				var fileName = getUrlParameter("file");
			} else {
				var fileName = "server.js";
			}
	    	var fileOid = "";
	    	// update container width
	    	$('.container').css('width', commit.length*50 + 'vw');
	    	// loop through commit history
	    	for(var i = commit.length-1; i >= 0; i--) {
		    	var blameOid = commit[i]['oid'];
		    	// find the correct file in commit tree
		    	for(var j = 0; j < commit[i]['tree']['entries'].length; j++) {
		    		if(commit[i]['tree']['entries'][j]['name'] == fileName) {
		    			fileOid = commit[i]['tree']['entries'][j]['oid'];
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
		    	var committedDate = new Date(commit[i]['committedDate']);
		    	commitHeader.textContent = ("0" + committedDate.getDate()).slice(-2) + " " +
										   getMonthName(committedDate) + " " +
										   committedDate.getFullYear() + " at " +
										   ("0" + committedDate.getHours()).slice(-2) + ":" +
										   ("0" + committedDate.getMinutes()).slice(-2) + " - " + 
										   commit[i]['message'];
		    	commitContainer.appendChild(commitHeader);
		    	commitContainer.appendChild(commitContent);
		    	$('.container').append(commitContainer);
		    	// add blame blocks inside commit
		    	getBlame(commitContent, name, owner, fileOid, fileName, blameOid);
		    }
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
	    				lineText.textContent = contents[j-1].replace("\t", "\xa0\xa0\xa0\xa0").replace("  ", "\xa0\xa0");
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