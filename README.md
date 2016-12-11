# agenda-rest
Scheduling as a Service

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
    callbackUrl,    // (optional) Url to call with response after invokation
    callbackMethod  // (optional) Callback request type, default: POST
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
        params,     // Path parameters, to replace `:param` notations in job definition's url
        query,      // Query parameters (?foo=bar&baz=qux)
        body        // Accompanying data sent along the request
    }
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
