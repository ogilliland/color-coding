$(document).ready(function() {
	$.ajax({
	    url: "https://api.github.com/graphql",
	    method: "POST",
	    dataType: "json",
	    contentType: "application/json; charset=utf-8",
	    data: JSON.stringify({ "query": "{ viewer { repositories(last: 1) { repository: nodes { name owner { login } description branch: ref(qualifiedName: \"master\") { commits: target { ... on Commit { history(first: 10) { commit: nodes { oid abbreviatedOid committedDate tree { entries { oid name } } } } } } } } } } }" }),
	    cache: false,
	    beforeSend: function (xhr) {
	        /* authorization header */
	        xhr.setRequestHeader("Authorization", "Bearer " + getCookieByName("githubToken"));
	    },
	    success: function (data) {
	    	$('.container').append(JSON.stringify(data) + "<br>");
	    },
	    error: function (jqXHR, textStatus, errorThrown) {
	    	// 
	    }
	});
});

var getCookieByName = function(name){
	var pair = document.cookie.match(new RegExp(name + '=([^;]+)'));
	return !!pair ? pair[1] : null;
};