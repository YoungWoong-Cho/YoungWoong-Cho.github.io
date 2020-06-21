/**
 * Main JS file for Scriptor behaviours
 */

/*globals jQuery, document */
(function ($) {
	"use strict";

	$(document).ready(function(){

		// Responsive video embeds
		$('.post-content').fitVids();

		// Scroll to content
		$('.cover .scroll-down').on('click', function(e) {
			$('html, body').animate({'scrollTop': $('.cover').height()}, 1800);
			e.preventDefault();
		});

		// Scroll to top
		$('.site-footer .top-link').on('click', function(e) {
			$('html, body').animate({'scrollTop': 0});
			e.preventDefault();
		});

		// Header adjustments
		adjustCover();
		$(window).bind('resize orientationchange', function() {
			adjustCover();
		});

		// Sidebar
		$('.sidebar-toggle, .overlay').on('click', function(e){
			$('body').toggleClass('sidebar-opened');
			e.preventDefault();
		});

		// Post reading time
		$('.post-template .post').readingTime();

		// Show comments
		if ( typeof disqus_shortname !== 'undefined' ) {
			$('.comments-title').on('click', function() {
				$.ajax({
					type: "GET",
					url: "//" + disqus_shortname + ".disqus.com/embed.js",
					dataType: "script",
					cache: true
				});
				$(this).off('click').addClass('comments-loaded');
			});
		}


		// Display recent posts and tagcloud
		if ( $('.recent-posts').length || $('.tagcloud').length ) {
			parseRss();
		}

	});

	function adjustCover() {
		if ( $('.cover .scroll-down').is(':hidden') )
			$('.post-header .cover-bg').css({ 'top' : 0 });
		else
			$('.post-header .cover-bg').css({ 'top' : $('.site-header').outerHeight() });
	}



	function getPosts(feeds) {
		var posts = [],
			items = [];
		feeds.forEach(function(feed) {
			items = $.merge(items, $(feed).find('item'));
		});
		for (var i = 0; i < items.length; i++) {
			var item = $(items[i]);
			posts.push({
				title: item.find('title').text(),
				url: item.find('link').text(),
				date: item.find('pubDate').text(),
				tags: $.map(item.find('category'), function(elem) {
					return $(elem).text();
				})
			});
		}
		return posts;
	}


	function formatDate(postDate) {
		var months = Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'),
			date = new Date(postDate),
			dateString = months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
		return dateString;
	}

	function displayTagCloud(posts) {
		var tagList = [],
			tagCloud = '';
		posts.forEach(function(post) {
			var tags = post.tags;
			tags.forEach(function(tag) {
				if ( $.inArray(tag, tagList) == -1 ) {
					tagList.push(tag);
				}
			});
		});
		for ( var i=0; i<tagList.length; i++ ) {
			var tag = tagList[i],
			tagLink = tag.replace(/\s+/g, '-').toLowerCase();
			tagCloud += ('<a href="/tag/' + tagLink + '" class="button dark">' + tag + '</a>');
		}
		$('.tagcloud').append(tagCloud);
	}

}(jQuery));
