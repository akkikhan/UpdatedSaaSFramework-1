# Template Management

Create and edit templates in the admin portal under *Email > Templates*. Templates support
variables using Mustache syntax:

```html
Hello {{user.name}},
Your account has been created.
```

Templates are versioned per tenant so changes do not affect existing emails.
