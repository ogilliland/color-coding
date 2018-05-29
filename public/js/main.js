$(document).ready(function() {

	if(getUrlParameter("owner") != null) {
		var owner = getUrlParameter("owner");
	} else {
		var owner = "ogilliland";
	}

	if(getUrlParameter("name") != null) {
		var repo = getUrlParameter("name");
	} else {
		var repo = "color-coding";
	}

	if(getUrlParameter("file") != null) {
		var fileName = getUrlParameter("file");
	} else {
		var fileName = "server.js";
	}

	$('#input-owner').val(owner);
	$('#input-name').val(repo);
	$('#input-file').val(fileName);

	getAllCommits(owner, repo, fileName).then(
		function success(commits) {
			// code to run when finished loading
	    	draw(commits);
		},
		function failure(jqXHR, textStatus, errorThrown) {
			// code to run if anything failed to load
	    	console.log(jqXHR, textStatus, errorThrown);
		}
	);
});

var getAscii = function(str) {
	return str.split('')
	  .map(function (char) {
	    return char.charCodeAt(0);
	  })
	  .reduce(function (current, previous) {
	    return previous + current;
	  });
}

var HSVtoRGB = function(h, s, v) {
	var r, g, b, i, f, p, q, t;
	i = Math.floor(h * 6);
	f = h * 6 - i;
	p = v * (1 - s);
	q = v * (1 - f * s);
	t = v * (1 - (1 - f) * s);
	
	switch (i % 6) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}
	return {
		'R': Math.round(r * 255),
		'G': Math.round(g * 255),
		'B': Math.round(b * 255)
	};
}

var getUserColor = function(username) {
	var hue = (getAscii(username)%50)/50; // pseudo-random color from username
	return { 'main': HSVtoRGB(hue, 0.8, 1), 'shadow': HSVtoRGB(hue, 0.8, 0.9) };
}

var setUserColors = function(users) {
	var sheet = document.createElement('style');
	for(var i = 0; i < users.length; i++) {
		var color = getUserColor(users[i]);
		sheet.innerHTML += ".user-" + users[i] + ".blame-block { background-color: rgb(" + color['main']['R'] + ", " + color['main']['G'] + ", " + color['main']['B'] + "); }\n";
		sheet.innerHTML += ".user-" + users[i] + ".line-number { background-color: rgb(" + color['shadow']['R'] + ", " + color['shadow']['G'] + ", " + color['shadow']['B'] + "); }\n";
	}
	document.head.appendChild(sheet);
}

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

var getAllCommits = function(owner, repo, fileName) {
	var deferred = $.Deferred(); // the "master" promise
	var commits = []; // define array to store commit data

	// inefficient query to get all commits for object
	// we will throw away everything but the commit sha
	$.ajax({
	    url: "https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=100&path=" + fileName,
	    method: "GET",
	    dataType: "json",
	    cache: false,
	    beforeSend: function (xhr) {
	        // authorization header
	        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
	    },
	    success: function (data) {
	    	for(var i = data.length-1; i >= 0; i--) {
	    		commits.push({ "commit": data[i]['sha'], "blob": "", "date": data[i]['commit']['author']['date'], "message": data[i]['commit']['message'] });
	    	}
	    	// getAllBlobs(owner, repo, fileName, commits);
	    	getAllBlobs(owner, repo, fileName, commits).then(
	    		function success(commits) {
	    			// code to run when *all* commits have loaded
			    	deferred.resolve(commits);
	    		},
	    		function failure(jqXHR, textStatus, errorThrown) {
	    			// code to run if a commit failed to load
			    	console.log(jqXHR, textStatus, errorThrown);
	    		},
	    		function progress(commitCount) {
	    			console.log("Downloaded " + commitCount + " commits so far...");
	    		}
	    	);
	    },
	    error: function (jqXHR, textStatus, errorThrown) {
	    	deferred.reject(jqXHR, textStatus, errorThrown);
			return;
	    }
	});

	return deferred.promise();
}

var getAllBlobs = function(owner, repo, fileName, commits) {
	var deferred = $.Deferred(); // the "master" promise
	var count = 0;

	var getBlob = function(i) {
		$.ajax({
		    url: "https://api.github.com/repos/" + owner + "/" + repo + "/commits/" + commits[i]['commit'],
		    method: "GET",
		    dataType: "json",
		    cache: false,
		    beforeSend: function (xhr) {
		        // authorization header
		        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
		    },
		    success: function (data) {
		    	// add blob sha to commits
		    	for(var j = 0; j < data['files'].length; j++) {
		    		if(data['files'][j]['filename'] === fileName) {
		    			commits[i]['blob'] = data['files'][j]['sha'];
		    		}
		    	}

		    	// get details
		    	getBlame(i);
		    },
		    error: function (jqXHR, textStatus, errorThrown) {
		    	// reject the promise if any commit fails to load
			    deferred.reject(jqXHR, textStatus, errorThrown);
			    return;
		    }
		});
	}

	var getBlame = function(i) {
		$.ajax({
		    url: "https://api.github.com/graphql",
		    method: "POST",
		    dataType: "json",
		    contentType: "application/json; charset=utf-8",
		    data: JSON.stringify({ "query": "{ repository(owner: \"" + owner + "\", name: \"" + repo + "\") { file: object(expression: \"" + commits[i]['blob'] + "\") { ... on Blob { text } } commit: object(expression: \"" + commits[i]['commit'] + "\") { ... on Commit { blame(path: \"" + fileName + "\") { ranges { startingLine endingLine commit { abbreviatedOid author { user { login name } } } } } } } } }" }),
		    cache: false,
		    beforeSend: function (xhr) {
		        // authorization header
		        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
		    },
		    success: function (data) {
		    	// reporting
		    	count++;
		    	deferred.notify(count);

		    	// add blob contents and blame to commits
		    	commits[i]['text'] = data['data']['repository']['file']['text'];
		    	commits[i]['blame'] = data['data']['repository']['commit']['blame']['ranges'];

		    	// resolve if this is the last commit
		    	if(count == commits.length) {
		    		deferred.resolve(commits);
		    	}
		    	
		    },
		    error: function (jqXHR, textStatus, errorThrown) {
		    	// reject the promise if any commit fails to load
		    	deferred.reject(jqXHR, textStatus, errorThrown);
			    return;
		    }
		});
	}

	for(var i = 0; i < commits.length; i++) {
		getBlob(i);
	}
	return deferred.promise();
}

var draw = function(commits) {
	var users = []; // we will fill this with usernames as we find them

	// update container width
	$('.container').css('width', commits.length*50 + 'vw');
	// loop through commit history
	for(var i = 0; i < commits.length; i++) {
    	// add basic commit container
    	var commitContainer = document.createElement('div');
    	commitContainer.classList.add('commit');
    	var commitContent = document.createElement('div');
    	commitContent.classList.add('commit-content');
    	var commitHeader = document.createElement('div');
    	commitHeader.classList.add('commit-header');
    	var committedDate = new Date(commits[i]['date']);
    	commitHeader.textContent = ("0" + committedDate.getDate()).slice(-2) + " " +
								   getMonthName(committedDate) + " " +
								   committedDate.getFullYear() + " at " +
								   ("0" + committedDate.getHours()).slice(-2) + ":" +
								   ("0" + committedDate.getMinutes()).slice(-2) + " - " + 
								   commits[i]['message'];
    	commitContainer.appendChild(commitHeader);
    	// add blame blocks inside commit
    	var fileText = commits[i]['text'].split("\n");
    	for(var j = 0; j < commits[i]['blame'].length; j++) {
    		var newBlock = document.createElement('div');
    		newBlock.classList.add('blame-block');
    		newBlock.classList.add('oid-' + commits[i]['blame'][j]['commit']['abbreviatedOid']);
    		newBlock.classList.add('user-' + userNotNull(commits[i]['blame'][j]['commit']['author']));
    		if(users.indexOf(userNotNull(commits[i]['blame'][j]['commit']['author'])) === -1) {
    			users.push(userNotNull(commits[i]['blame'][j]['commit']['author']));
    		}
    		for (var k = commits[i]['blame'][j]['startingLine']; k <= commits[i]['blame'][j]['endingLine']; k++) {
    			var newLine = document.createElement('div');
    			newLine.classList.add('blame-line');
    			var lineNumber = document.createElement('div');
    			lineNumber.classList.add('line-number');
    			lineNumber.classList.add('user-' + userNotNull(commits[i]['blame'][j]['commit']['author']));
    			lineNumber.textContent = k;
    			var lineText = document.createElement('div');
    			lineText.classList.add('line-text');
    			if(fileText[k-1].replace(/\t/g, "").replace(/ /g, "").length < 1) {
    				 lineText.innerHTML = "<br>";
    			} else {
    				lineText.textContent = fileText[k-1].replace(/\t/g, "\xa0\xa0\xa0\xa0").replace(/  /g, "\xa0\xa0");
    			}
    			newLine.appendChild(lineNumber);
    			newLine.appendChild(lineText);
    			newBlock.appendChild(newLine);
			}
			commitContent.appendChild(newBlock);
    	}
    	commitContainer.appendChild(commitContent);
    	$('.container').append(commitContainer);
    }

	// add users
    setUserColors(users);
}

var userNotNull = function(author) {
	if(author['user'] === null) {
		return "undefined";
	} else {
		return author['user']['login'];
	}
}