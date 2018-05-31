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
			var users = []; // we will fill this with usernames as we find them
			var numShown = Math.min(commits.length, 4);
	    	// update container width
			$('.container').css('width', (commits.length*50 - 4) + 'vw');
			// draw first 3 blocks
			drawCommitContainers(commits);
			drawCommits(users, commits, 0, numShown);
			// draw first 2 transitions
			drawLinks(users, commits, 0, numShown-1);
			// add user styles
			setUserColors(users);
			// define scroll event
			$(window).scroll(function() {
				if($(window).scrollLeft() > $(window).width()/2) {
					var numToShow = 3 + Math.ceil($(window).scrollLeft()/($(window).width()/2));
					if(numShown < numToShow) {
						// draw new elements
						drawCommits(users, commits, numShown, numToShow);
						// draw new transitions
						drawLinks(users, commits, numShown-1, numToShow-1);
						// update user styles
						updateUserColors(users);
						// update count
						numShown = numToShow;
					}
				}
			});
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
	return { 'main': HSVtoRGB(hue, 0.8, 1), 'dark': HSVtoRGB(hue, 0.8, 0.9), 'darker': HSVtoRGB(hue, 0.8, 0.85) };
}

var setUserColors = function(users) {
	var sheet = document.createElement('style');
	sheet.id = 'user-styles';
	for(var i = 0; i < users.length; i++) {
		var color = getUserColor(users[i]);
		sheet.innerHTML += ".user-" + users[i] + ".blame-block { background-color: rgb(" + color['main']['R'] + ", " + color['main']['G'] + ", " + color['main']['B'] + "); }\n";
		sheet.innerHTML += ".user-" + users[i] + ".line-number { background-color: rgb(" + color['dark']['R'] + ", " + color['dark']['G'] + ", " + color['dark']['B'] + "); }\n";
		sheet.innerHTML += ".user-" + users[i] + ".transition { fill: rgb(" + color['darker']['R'] + ", " + color['darker']['G'] + ", " + color['darker']['B'] + "); }\n";
	}
	document.head.appendChild(sheet);
}

var updateUserColors = function(users) {
	var sheet = document.getElementById('user-styles');
	sheet.innerHTML = '';
	for(var i = 0; i < users.length; i++) {
		var color = getUserColor(users[i]);
		sheet.innerHTML += ".user-" + users[i] + ".blame-block { background-color: rgb(" + color['main']['R'] + ", " + color['main']['G'] + ", " + color['main']['B'] + "); }\n";
		sheet.innerHTML += ".user-" + users[i] + ".line-number { background-color: rgb(" + color['dark']['R'] + ", " + color['dark']['G'] + ", " + color['dark']['B'] + "); }\n";
		sheet.innerHTML += ".user-" + users[i] + ".transition { fill: rgb(" + color['darker']['R'] + ", " + color['darker']['G'] + ", " + color['darker']['B'] + "); }\n";
	}
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

var drawCommitContainers = function(commits) {
	// loop through commit history
	for(var i = 0; i < commits.length; i++) {
    	// add basic commit container
    	var commitContainer = document.createElement('div');
    	commitContainer.classList.add('commit');
    	commitContainer.id = i+1;
    	var commitContent = document.createElement('div');
    	commitContent.classList.add('commit-content');
    	if(i == commits.length-1) {
    		commitContainer.classList.add('last');
    		commitContent.classList.add('last');
    	} else {
			var transition = document.createElement('div');
	    	transition.classList.add('commit-transition');
    	}
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
    	commitContainer.appendChild(commitContent);
    	if(i != commits.length-1) {
    		commitContainer.appendChild(transition);
    	}
    	$('.container').append(commitContainer);
    }
}

var drawCommits = function(users, commits, first, last) {
	if(last > commits.length) {
		last = commits.length;
	}
	if(first > last) {
		return;
	}
	// loop through commit history
	for(var i = first; i < last; i++) {
    	// find commit container
    	var commitContent = $('#'+(i+1)).find('.commit-content');
    	// add blame blocks inside commit
    	commits[i]['text'] = commits[i]['text'].split("\n");
    	for(var j = 0; j < commits[i]['blame'].length; j++) {
    		var newBlock = document.createElement('div');
    		newBlock.classList.add('blame-block');
    		newBlock.classList.add('oid-' + commits[i]['blame'][j]['commit']['abbreviatedOid']);
    		newBlock.classList.add('user-' + userNotNull(commits[i]['blame'][j]['commit']['author']));
    		newBlock.id = (i+1) + "-" + (j+1);
    		if(users.indexOf(userNotNull(commits[i]['blame'][j]['commit']['author'])) === -1) {
    			users.push(userNotNull(commits[i]['blame'][j]['commit']['author']));
    		}
    		for (var k = commits[i]['blame'][j]['startingLine']; k <= commits[i]['blame'][j]['endingLine']; k++) {
    			var newLine = document.createElement('div');
    			newLine.classList.add('blame-line');
    			// newLine.id = (i+1) + "-" + (j+1) + "-" + k;
    			newLine.id = 'line-' + k;
    			var lineNumber = document.createElement('div');
    			lineNumber.classList.add('line-number');
    			lineNumber.classList.add('user-' + userNotNull(commits[i]['blame'][j]['commit']['author']));
    			lineNumber.textContent = k;
    			var lineText = document.createElement('div');
    			lineText.classList.add('line-text');
    			if(commits[i]['text'][k-1].replace(/\t/g, "").replace(/ /g, "").length < 1) {
    				 lineText.innerHTML = "<br>";
    			} else {
    				lineText.textContent = commits[i]['text'][k-1].replace(/\t/g, "\xa0\xa0\xa0\xa0").replace(/  /g, "\xa0\xa0");
    			}
    			newLine.appendChild(lineNumber);
    			newLine.appendChild(lineText);
    			var clearDiv = document.createElement('div');
    			clearDiv.setAttribute('style', 'clear: both;');
    			newLine.appendChild(clearDiv);
    			newBlock.appendChild(newLine);
			}
			commitContent.append(newBlock);
    	}
    }
}

var userNotNull = function(author) {
	if(author['user'] === null) {
		return "undefined";
	} else {
		return author['user']['login'];
	}
}

// abuse the DOM to draw transitions
var drawLinks = function(users, commits, first, last) {
	// TODO - solve the transition conflict when commit blocks are re-merged
	//        by looking at all text in commit sha instead of all text in blame version
	//        [a1][b1][a2] --> [a12] doesn't display correctly
	if(last > commits.length) {
		last = commits.length;
	}
	if(first > last) {
		return;
	}
	for(var i = first; i < last; i++) {
		var k = 0; // count line number across blocks
		var ns = 'http://www.w3.org/2000/svg';
		var svg = document.createElementNS(ns, 'svg');
		svg.setAttributeNS(null, 'width', '100%');
		if($('#'+(i+2)).find('.commit-content').height() === undefined) {
			svg.setAttributeNS(null, 'height', '0px');
		} else {
			svg.setAttributeNS(null, 'height', (Math.max($('#'+(i+2)).find('.commit-content').height(),$('#'+(i+1)).find('.commit-content').height())-5)+'px');
		}
		svg.setAttributeNS(null, 'style', 'z-index: -1;');
		$('#'+(i+1)).find('.commit-transition').append(svg);
		var linesMatched = [ {}, {} ];
		// iterate over lines in this commit
		for(var j = 0; j < commits[i]['text'].length; j++) {
			// iterate over lines in next commit
			for(var k = 0; k < commits[i+1]['text'].length; k++) {
				var lineCount = 0;
				var run = true;
				while(run) {
					if($('#'+(i+1)).find('#line-'+(j+1+lineCount)).find('.line-text').html() !== $('#'+(i+2)).find('#line-'+(k+1+lineCount)).find('.line-text').html()
					|| getOid($('#'+(i+1)).find('#line-'+(j+1+lineCount)).parent().attr('class')) !== getOid($('#'+(i+2)).find('#line-'+(k+1+lineCount)).parent().attr('class'))
					|| getOid($('#'+(i+1)).find('#line-'+(j+1)).parent().attr('class')) !== getOid($('#'+(i+1)).find('#line-'+(j+1+lineCount)).parent().attr('class'))
					|| linesMatched[0][String(j+1+lineCount)]
					|| linesMatched[1][String(k+1+lineCount)]
					|| j+lineCount >= commits[i]['text'].length
					|| k+lineCount >= commits[i+1]['text'].length
					|| $('#'+(i+1)).find('#line-'+(j+1+lineCount)).find('.line-text').html() === undefined) {
						run = false;
					} else {
						lineCount++;
					}
				}
				if(lineCount > 0) {
					var xOffset = $('#'+(i+1)).find('.commit-content').offset().left + $('#'+(i+1)).find('.commit-content').width();
					var yOffset = $('#'+(i+1)).find('.commit-content').offset().top;
					var x1 = $('#'+(i+1)).find('#line-'+(j+1)).offset().left + $('#'+(i+1)).find('#line-'+(j+1)).width();
					var y1 = $('#'+(i+1)).find('#line-'+(j+1)).offset().top;
					var x2 = $('#'+(i+2)).find('#line-'+(k+1)).offset().left;
					var y2 = $('#'+(i+2)).find('#line-'+(k+1)).offset().top;
					var x3 = $('#'+(i+2)).find('#line-'+(k+lineCount)).offset().left;
					var y3 = $('#'+(i+2)).find('#line-'+(k+lineCount)).offset().top + $('#'+(i+2)).find('#line-'+(k+lineCount)).height();
					var x4 = $('#'+(i+1)).find('#line-'+(j+lineCount)).offset().left + $('#'+(i+1)).find('#line-'+(j+lineCount)).width();
					var y4 = $('#'+(i+1)).find('#line-'+(j+lineCount)).offset().top + $('#'+(i+1)).find('#line-'+(j+lineCount)).height();
					var user = getUser($('#'+(i+1)).find('#line-'+(j+1)).parent().attr('class'));
					// draw shape
					// console.log('MATCH @ ['+j+' ---> '+(j+lineCount)+'] ['+k+' ---> '+(k+lineCount)+']');
					drawLink(ns, svg, user, xOffset, yOffset, x1, y1, x2, y2, x3, y3, x4, y4);
					// mark these lines as off limits
					offLimits(linesMatched, 0, j, j+lineCount);
					offLimits(linesMatched, 1, k, k+lineCount);
				}
			}
		}
	}
}

var drawLink = function(ns, svg, user, xOffset, yOffset, x1, y1, x2, y2, x3, y3, x4, y4) {
	yOffset = yOffset + 3;
	var poly = document.createElementNS(ns, 'polygon');
	poly.setAttributeNS(null, 'points', (x1-xOffset)+','+(y1-yOffset)+' '+(x2-xOffset)+','+(y2-yOffset)+' '+(x3-xOffset)+','+(y3-yOffset+6)+' '+(x4-xOffset)+','+(y4-yOffset+6));
	poly.setAttributeNS(null, 'class', 'user-'+user+' transition');
	svg.appendChild(poly);
}

var offLimits = function(linesMatched, commit, start, end) {
	for(var i = start; i <= end; i++) {
		linesMatched[commit][String(i)] = true;
	}
}

var getOid = function(classList) {
	if(classList === undefined) {
		return "undefined";
	} else {
		var classes = classList.split(' ');
		for(var i = 0; i < classes.length; i++) {
			if(classes[i].substring(0, 4) == 'oid-') {
				return classes[i].substring(4);
			}
		}
	}
}

var getUser = function(classList) {
	if(classList === undefined) {
		return "undefined";
	} else {
		var classes = classList.split(' ');
		for(var i = 0; i < classes.length; i++) {
			if(classes[i].substring(0, 5) == 'user-') {
				return classes[i].substring(5);
			}
		}
	}
}