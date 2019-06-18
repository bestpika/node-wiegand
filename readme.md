# node-wiegand

Decoder for [wiegand](https://en.wikipedia.org/wiki/Wiegand_interface) readers on GPIO.
Currently works on linux only, but can be tested on other platforms.

## requirements

* Linux with GPIO
* node-gyp

## usage

```javascript
const Wiegand = require('wiegand');
const w = new Wiegand();
w.begin({ d0: 17, d1: 18 });
w.on('data', (data) => {
  console.log('Got', data.length, 'bits from wiegand with data:', data);
});
w.on('keypad', (num) => {
  console.log('Got', num, 'from the reader\'s keypad');
});
w.on('reader', (id) => {
  console.log('Got', id, 'from RFID reader');
});
```

## license

[MIT](https://opensource.org/licenses/MIT)
