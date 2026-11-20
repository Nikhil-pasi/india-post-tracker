# India Post Parcel Tracker

This is a small Node.js app that serves the tracking page and proxies tracking requests to Speed India Post. The browser renders the returned status and scan history directly in the page; it does not embed or redirect to the provider's widget.

## Run locally

Use Node.js 18 or later, then run:

```sh
node server.js
```

Open `http://127.0.0.1:4175`. A tracking link can include a number, for example `http://127.0.0.1:4175/?id=YA463158920IN`; the customer clicks **Track parcel** to load its details.

For deployment, run this Node server (or adapt its `/api/track` handler to your hosting platform's serverless function). Set `PORT` if the hosting provider supplies a port. Tracking data is retrieved from Speed India Post when a customer submits the form and briefly cached for 30 seconds.
