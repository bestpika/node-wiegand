'use strict'

const debug = require('debug')('wiegand')
const EventEmitter = require('events')
const Gpio = require('onoff').Gpio
const TIMEOUT = parseInt(process.env.WIEGAND_TIMEOUT) || 25

class Wiegand extends EventEmitter {
  /**
   * 建構元
   *
   * @emits keypad
   * @emits reader
   */
  constructor () {
    super()
    this.data = []
    this.gpio = { d0: 17, d1: 18 }
    this.timeout = null

    this.on('data', (data) => {
      switch (true) {
        case data.length >= 34:
          data = data.slice(0, 34)
          this._emitReader(data)
          break
        case data.length >= 26:
          data = data.slice(0, 26)
          this._emitReader(data)
          break
        case data.length === 4:
          this.emit('keypad', parseInt(data.join(''), 2))
          break
        default:
          break
      }
    })
  }
  /**
   * 呼叫 reader 事件
   *
   * @param {Array} data
   *
   * @emits reader
   */
  _emitReader (data) {
    if (this._checkParity(data)) {
      this.emit('reader', parseInt(data.slice(1, -1).join(''), 2))
    }
  }
  /**
   * 奇偶校驗
   *
   * @param {Array} data
   * @return {Boolean} okay
   */
  _checkParity (data) {
    let okay = true
    let evenParity = data.slice(0, data.length / 2)
    let oddParity = data.slice(data.length / 2)

    let fn = (x) => x

    if (evenParity.filter(fn).length & 1) {
      okay = false
    }
    if (!(oddParity.filter(fn).length & 1)) {
      okay = false
    }
    return okay
  }
  /**
   * 收到讀取的事件
   *
   * @param {Gpio} pin
   * @param {Number} data
   *
   * @emits data
   */
  _handleBit (pin, data) {
    pin.watch((_, value) => {
      clearTimeout(this.timeout)
      this.data.push(data)
      this.timeout = setTimeout(() => {
        if (this.data.length >= 4) {
          this.emit('data', this.data.slice())
        }
        this.data = []
      }, TIMEOUT)
    })
  }
  /**
   * 監聽 Gpio
   *
   * @param {Function} callback
   *
   * @emits ready
   */
  _listenToGpio (callback) {
    this._handleBit(this.d0, 0)
    this._handleBit(this.d1, 1)
    // should be good to go
    this.emit('ready', null)
    callback && this.removeListener('error', callback)
  };
  /**
   * 開始接收資料
   *
   * @param {Object} options
   * @param {Function} callback
   *
   * @emits ready
   * @emits error
   */
  begin (options, callback) {
    if (typeof options === 'function') {
      debug('#begin() - first arg is a function')
      callback = options
    }
    if (typeof options !== 'object') {
      debug('#begin() - second arg is not an object or undefined')
      options = {}
    }
    if (typeof callback !== 'function') {
      debug('#begin() - no callback provided')
      callback = null
    }

    callback && this.once('ready', callback)
    callback && this.once('callback', callback)

    this.gpio.d0 = options.d0 || this.gpio.d0
    this.gpio.d1 = options.d1 || this.gpio.d1

    this.d0 = new Gpio(this.gpio.d0, 'in', 'rising')
    this.d1 = new Gpio(this.gpio.d1, 'in', 'rising')

    // sync methods below because it's eaiser to deal with at startup
    process.nextTick(this._listenToGpio.bind(this))
  }
  /**
   * 停止
   *
   * @param {Function} callback
   *
   * @emits stop
   */
  stop (callback) {
    this.d0.unwatchAll()
    this.d1.unwatchAll()
    this.d0.unexport()
    this.d1.unexport()
    callback && this.once('stop', callback)
    this.emit('stop')
  }
}

module.exports = Wiegand
