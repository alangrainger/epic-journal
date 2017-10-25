import db from './datastore'

let http = require('http')
let url = require('url')

let server = http.createServer(function (req, res) {
  let request = url.parse(req.url, true)
  let id = request.query['id']

  if (id) {
    db.getAttachment(id)
      .then((row) => {
        // res.writeHead(200, {'Content-Type': row.mime_type})
        res.end(row.data)
      })
    /*
    let action = request.pathname
    if (action === '/bunny.jpg') {
      var img = fs.readFileSync('./src/main/bunny.jpg')
      res.writeHead(200, {'Content-Type': 'image/jpg'})
      res.end(img, 'binary')
    } else {
      res.writeHead(200, {'Content-Type': 'text/plain'})
      res.end('Hello World \n')
    } */
  }
})

server.listen(2528, function () {
  console.log('Listening on http://localhost:2528/')
})
