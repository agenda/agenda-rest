[![npm version](https://badge.fury.io/js/agenda-rest.svg)](https://www.npmjs.com/package/agenda-rest)
<a href="https://slackin-ekwifvcwbr.now.sh/"><img src="https://slackin-ekwifvcwbr.now.sh/badge.svg" alt="Slack Status"></a>

# agenda-rest

Scheduling as a Service, based on [Agenda](https://github.com/rschmukler/agenda)

Assuming all job types could be thought of as REST endpoints, scheduling could be offered as a service. `agenda-rest` does just that, introduce a url, name it, agenda-rest will call it on the times that you specify.

## Usage
```bash
npm install -g agenda-rest
agenda-rest --dbhost localhost --dbname agenda
```
## APIs

### **`/api/new`**
Defines a new category of jobs

* Method: POST
* Data:
```javascript
{
    name,           // New job type's name
    url,            // koa-router style url
    method,         // (optional) Request type, default: POST
    callback: {     // (optional) to call with response after invocation
        url,
        method,
        headers
    }
}
```

### **`/api/schedule`** & **`/api/every`**
Schedule a job for single or multiple occurrences

* Method: POST
* Data:
```javascript
{
    name,           // Name of the type to create the instance from
    human_interval, // Interval in which job should be invoked
    data: {         // (optional) default: {}
        headers,    // Http headers, e.g. { Authorization: '<token>' }
        params,     // Path parameters, to replace `:param` notations in job definition's url
        query,      // Query parameters (?foo=bar&baz=qux)
        body        // Accompanying data sent along the request
    }
}
```

Callback, if present, would be invoked by the following object:
```javascript
{
    data: {
        // passed data object, same as above
    },
    response        // response from invocation
}
```

### **`/api/cancel`**
Cancels any jobs matching the query

* Method: POST
* Data: Mongo query
```javascript
{
    name: "foo"
}
```
