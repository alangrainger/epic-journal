import db from '../datastore'
import moment from 'moment'

function Entry () {
  this.id = null
  this.date = moment().format(db.DATE_DAY)
  this.content = null

  this.test = function () {
    db.getEntryByDate('2017-10-12', function (row) {
      console.log(row)
    })
  }
}

export default Entry
