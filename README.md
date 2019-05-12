# sitePreloader.js
A small JavaScript class to preload a website's pages for smooth page transitions.

### How to get started
Simply load the file and register sitePreloader.js as a new class.

In your HTML document:
```html
<script src="../path/to/sitePreloader.min.js" type="text/javascript">
```
And initialise in your JavaScript once the DOM has been loaded:
```javascript
let preloader = new sitePreloader();
```

### How transitions are being displayed

The class itself does not introduce any CSS to style the page transition. At its core, it simply switches out the content on top of other things. However, it introduces a set of classes attached to the ```<html>``` element to trigger any CSS animations you declare yourself.

* **is-hovering-page-link**: will be added and removed once an indexed link is/has been hovered with the mouse
* **is-changing-page**: will be added when a link is clicked, but before the switch was made, and removed once everything is over

You can specify how long the delay between the click of a link and the switch to the new page takes by declaring the ```delayBeforeSwitch``` option (see below).

### Options

There are a number of parameters to customise during the initialisation of the class. The full range looks like this, with each parameter set to its default:
```javascript
let args = {
    home: window.location.origin    // URL of the website's homepage (only links pointing to here or its subdirectories will be considered)
    wrapper:             'body',    // CSS selector for the area to be preloaded and switched
    linkSelector:        'a',       // CSS selector for links to be included. Will only preload same-origin links anyway
    chacheImmediately:    true,     // whether to cache pages once they're found
    cacheEntryPage:       true,     // whether to also cache the first page a user visits
    delayBeforeSwitch:    400,      // amount in milliseconds to wait before the new page is being displayed
    switchRootAttributes: true,     // whether to switch attributes on the <html> element (e.g. lang, manifest)
    switchRootClasses:    true,     // whether to switch classes on the <html> element
    switchBodyClasses:    true,     // whether to switch classes on the <body> element
    switchWrapperClasses: true,     // whether to switch classes on the <body> element
    switchPageTitle:      true,     // whether to switch the page title given by the <title> element
    smoothScroll:         true,     // whether to scroll smoothly after page switch

//  Hooks for events
    onAfterPagePreload:    [],     // function or array of functions to be fired after a page was preloaded
    onBeforeSwitch:        [],     // function or array of functions to be fired before content will be switched
    onAfterSwitch:         [],     // function or array of functions to be fired after content has been switched

//  Hooks for filters
    beforePageStorage:     [],     // function or array of functions to filter the fetched document before it is stored
};

let preloader = new sitePreloader(args);
```

### Events

Several events (not in the specific JS sense) can be subscribed to, by declaring a callback function of an array of such as the appropriate parameter (see above). They will be called in the order of their declaration and receive the following arguments, however sitePreloader.js does not process any return values.

* **onAfterPagePreload**(*page*): will be called just after a new page was added to the internal cache (see below)
* **onBeforeSwitch**(*page*): will be called just before the switch to a new page is made (see below)
* **onAfterSwitch**(*page*): will be called just after the switch to a new page was made (see below)

##### Usage

Callbacks for the ``onAfterPagePreload`` event, the ``onBeforeSwitch`` and ``onAfterSwitch`` will be passed a page object with data of the preloaded page:

```javascript
function some_callback(page) {
/* page = {
        bodyClasses: …,    // string containing the classes of the page's <body> tag
        content: …,        // string containing the inner HTML of the page's wrapper region (see options)
        id: …,             // the internal identifier used for this page (directly tied to its URL),
        links: …,          // array of associated links pointing to this page, represented by a link object { element, eventsRegistered, url }
        loaded: …,         // Boolean whether this page has been preloaded (always true)
        rootAttributes: …, // array of objects { name, value } of attributes of the page's <html> element (excluding class)
        rootClasses: …,    // string containing the classes of the page's <html> element
        title: …,          // string containing the page's title as given by the <title> element
        url: …,            // string containing the page's URL
        wrapperClasses: …, // string containing the classes of the page's wrapper element (see options)
    } */
}
```

### Filters

Filters can be used to intercept the behavior of sitePreloader.js. Filter callbacks will be executed in the order of their declaration. At this moment, there is only one filter available.
* **beforePageStorage**(*url, newDocument*): the callback will be passed the url and a string containing the complete document and is required to return the changed document string

##### Usage

```javascript
function some_callback(url, newDocument) {
    // do something…
    return newDocument;
}
```

### Usage after initialisation of the class

After initialisation of the class, several useful methods can be invoked on the instance, e.g. ```preloader.scanLinks()```.
* **createPageId(** *url* **)**: Create an id for a given url, e.g. in correspondence with the ```switchTo()``` method (see below).
* **scanLinks()**: You can trigger the scanning process for new links, e.g. after changes to the DOM were made.
* **switchTo(** *id* **)**: Initiate a switch to a page given by its id (see above, "Events" -> "Usage"). This will return ```false``` if the page is already the current page or if no page with the given id was indexed.

### Future developments

I have a few further features in mind which could be helpful. If you'd like to contribute, don't hesitate!
* Preload assets found within the cached pages, e.g. images, fonts, scripts etc.
* Establish a proper testing pipeline.
* Possibly get rid of the Promise in favour for async/await or just synchronous code. Not sure if the difference is neglible.
* Refactor code to extend compatibility for older browsers.
