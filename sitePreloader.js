/***
	sitePreloader.js
	Github: https://github.com/thisancog/sitePreloader
	License: MIT
 ***/

"use strict";

class sitePreloader {
	constructor(options) {
		this.entry = window.location.href;
		this.root = document.documentElement;
		this.body = document.querySelector('body');
		this.wrapper = this.body;

		this.pages = {};
		this.active = this.createPageId(this.entry);

		this.parseOptions(options);
		this.registerEvents();
	}


	/***************************************
		Set parameters
	***************************************/

	parseOptions(options = {}) {
		let defaults = {
			home:                 window.location.origin,
											// URL of the website's homepage (only links pointing to here or its subdirectories will be considered)
			wrapper:              'body',	// CSS selector for the area to be preloaded and switched
			linkSelector:         'a',		// CSS selector for links to be included. Will only preload same-origin links anyway
			chacheImmediately:    true,		// whether to cache pages once they're found
			cacheEntryPage:       true,		// whether to also cache the first page a user visits
			delayBeforeSwitch:    400,		// amount in milliseconds to wait before the new page is being displayed
			switchRootAttributes: true,		// whether to switch attributes on the <html> element (e.g. lang, manifest)
			switchRootClasses:    true,		// whether to switch classes on the <html> element
			switchBodyClasses:    true,		// whether to switch classes on the <body> element
			switchWrapperClasses: true,		// whether to switch classes on the <body> element
			switchPageTitle:      true,		// whether to switch the page title given by the <title> element
			smoothScroll:         true,		// whether to scroll smoothly after page switch

		//	Hooks for events
			onAfterPagePreload:   [],		// function or array of functions to be fired after a page was preloaded
			onBeforeSwitch:       [],		// function or array of functions to be fired before content will be switched
			onAfterSwitch:        [],		// function or array of functions to be fired after content has been switched

		//	Hooks for filters
			beforePageStorage:    [],		// function or array of functions to filter the fetched document before it is stored
		};

		options = Object.assign(defaults, options);
		this.wrapper             = document.querySelector(options.wrapper);
		this.wrapperSelector     = options.wrapper;
		this.events = {
			onAfterPagePreload: this.castAsArray(options.onAfterPagePreload),
			onBeforeSwitch:     this.castAsArray(options.onBeforeSwitch),
			onAfterSwitch:      this.castAsArray(options.onAfterSwitch),
		}

		this.filters = {
			beforePageStorage:  this.castAsArray(options.beforePageStorage)
		}

		delete options.wrapper;
		delete options.onAfterPagePreload;
		delete options.onBeforeSwitch;
		delete options.onAfterSwitch;
		delete options.beforePageStorage;

		Object.assign(this, options);
	}


	/***************************************
		Register all events
	***************************************/

	registerEvents() {
		this.cacheEntrySite();
		this.scanLinks();

		window.addEventListener('popstate', this.switchBack.bind(this));
	}


	/***************************************
		Scan entry point page
	***************************************/

	cacheEntrySite() {
		if (!this.cacheEntryPage) return;
		this.createNewPageObject(this.entry);
	}


	/***************************************
		Scan for new links
	***************************************/

	scanLinks() {
		let selector = this.linkSelector + '[href^="' + this.home + '"]:not([data-scanned]), '
			         + this.linkSelector + '[href^="/"]' +            ':not([data-scanned])',
			newLinks = this.body.querySelectorAll(selector);

		newLinks.forEach((function(link) {
			if (link.target && (link.target !== '_self' && link.target !== '_top')) return;
			if (link.href === this.entry && !this.cacheEntryPage) return;

			const destination = link.href;
			
			let	id = this.createPageId(destination),
				linkObject = {
					element: link,
					eventsRegistered: false,
					url: destination
				};

			link.dataset.scanned = true;
			this.hookUpLink(linkObject, id);

		//	page was already indexed
			if (this.has(this.pages, id))
				return this.pages[id].links.push(linkObject);

			this.createNewPageObject(destination, linkObject);
		}).bind(this));
	}


	/***************************************
		Create a new page object
	***************************************/

	createNewPageObject(url, links = []) {
		const id = this.createPageId(url),
			page = {
				bodyClasses:	'',
				content:		'',
				id:				id,
				links:			this.castAsArray(links),
				loaded:			false,
				rootAttributes:	[],
				rootClasses:	'',
				title:			'',
				url:			url,
				wrapperClasses:	'',
			};

		this.pages[id] = page;

		if (this.chacheImmediately)
			this.preloadPage(id);
	}


	/***************************************
		Preload and store a new page
	***************************************/

	preloadPage(id) {
		const url = this.pages[id].url;

		if (url === window.location.href) {
			this.storePage(id, document);
		} else {
			this.requestPage(url).then((function(doc) {
					this.storePage(id, doc);
				}).bind(this)).catch(function(error) {
					console.error('There was an error trying to fetch content: ' + error.statusText + ' – Request-URL: ' + url);
				});
		}
	};

	storePage(id, newDocument = document) {
		if (!newDocument) return;

		const url = this.pages[id].url;

		if (this.filters.beforePageStorage.length > 0)
			this.filters.beforePageStorage.forEach(cb => newDocument = cb(url, newDocument));

		const newWrapper = newDocument.querySelector(this.wrapperSelector),
			  updated = {
				bodyClasses:	newDocument.querySelector('body').className,
				content:		newWrapper.innerHTML,
				rootAttributes:	[].slice.call(newDocument.documentElement.attributes)
									.map((attr) => { return {name: attr.name, value: attr.value} })
									.filter(attr => attr.name !== 'class'),
				loaded:			true,
				rootClasses:	newDocument.documentElement.className,
				title:			newDocument.querySelector('title').innerText,
				wrapperClasses:	newWrapper.className
			  };

		this.pages[id] = Object.assign(this.pages[id], updated);

		if (this.events.onAfterPagePreload.length > 0)
			this.events.onAfterPagePreload.forEach((cb => cb(this.pages[id])).bind(this));
	}


	/***************************************
		Link interactivity
	***************************************/

	hookUpLink(link, id) {
		if (link.eventsRegistered) return;

		link.element.addEventListener('mouseover', this.onMouseOverLink.bind(this));
		link.element.addEventListener('mouseout',  this.onMouseOutLink.bind(this));
		link.element.addEventListener('click',     this.onClickLink.bind(this));

		link.eventsRegistered = true;
	}

	onMouseOverLink(e) {
		const id = this.getIdFromLink(e.target);
		this.root.classList.add('is-hovering-page-link');

		if (this.pages[id].loaded) return;

		this.preloadPage(id);
	}

	onMouseOutLink(e) {
		this.root.classList.remove('is-hovering-page-link');
	}

	onClickLink(e) {
		const id = this.getIdFromLink(e.target);
		if (!this.pages[id].loaded) return;

		e.preventDefault();
		this.switchTo(id);
	}


	/***************************************
		Switch between pages
	***************************************/

	switchTo(id) {
		if (id === this.active || !this.has(this.pages, id)) return false;

		const newPage = this.pages[id];
		const scrollBehavior = this.smoothScroll ? 'smooth' : 'auto';

		if (this.events.onBeforeSwitch.length > 0)
			this.events.onBeforeSwitch.forEach(cb => cb(newPage));

		if (this.switchPageTitle)
			document.title = newPage.title;

		this.root.classList.add('is-changing-page');

		setTimeout((function() {
			this.wrapper.innerHTML = newPage.content;

			if (this.switchWrapperClasses)	this.wrapper.classList = newPage.wrapperClasses;
			if (this.switchBodyClasses)		this.body.className    = newPage.bodyClasses;
			if (this.switchRootClasses)		this.root.className    = newPage.rootClasses + ' is-changing-page';
			if (this.switchRootAttributes)
				newPage.rootAttributes.forEach((attr => this.root.setAttribute(attr.name, attr.value)).bind(this));

			if (this.events.onAfterSwitch.length > 0)
				this.events.onAfterSwitch.forEach(cb => cb(newPage));

			window.history.pushState({ id: id, url: newPage.url }, newPage.title, newPage.url);
			window.scrollTo({ top: 0, behavior: scrollBehavior });

			setTimeout((function() {
				this.root.classList.remove('is-changing-page')
				this.scanLinks();
				this.active = id;

			}).bind(this), 400)
		}).bind(this), this.delayBeforeSwitch);
	};

	switchBack(e) {
		if (!e.state || !e.state.id) return;
		const id = e.state.id;

		if (!this.pages[id])
			return (window.location.href = e.state.url);

		this.switchTo(id);
	};



	/***************************************
		Helper functions
	***************************************/

//	removes trailing slashes for consistency
	createPageId(s) {
		return Math.abs(s.replace(/\/$/, '').split('').reduce(function(a ,b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0));
	}

	getIdFromLink(elem) {
		while (elem.tagName !== 'A' && !(elem.dataset && elem.dataset.scanned) && elem.parentElement)
			elem = elem.parentElement;

		if (elem.tagName === 'A' && elem.dataset && elem.dataset.scanned)
			return this.createPageId(elem.href);
	}

	// protects from null objects and overridden .hasOwnProperty method
	has(obj, key) {
		let lookup = Object.prototype.hasOwnProperty;
		return lookup.call(obj, key);
	}

	castAsArray(input = null) {
		if (Array.isArray(input))	return input;
		if (input === null)			return [];
									return [input];
	}

	requestPage(url) {
		return new Promise((function(resolve, reject) {
			let xhr = new XMLHttpRequest();

			if ('withCredentials' in xhr) {
			} else if (typeof XDomainRequest !== 'undefined') {
				xhr = new XDomainRequest();
			} else {
				reject({
					status: 400,
					statusText: 'This browser does not support XMLHttpRequests or XDomainRequests.'
				});
			}

			xhr.responseType = 'document';
			xhr.open('GET', url);

			xhr.onload = function() {
				if (xhr.status >= 200 && xhr.status < 300)	resolve(xhr.response);
				else	reject({ status: xhr.status, statusText: xhr.statusText });
			};

			xhr.onerror = function() { reject({ status: xhr.status, statusText: xhr.statusText }); };
			xhr.send();
		}).bind(this));
	}
}
