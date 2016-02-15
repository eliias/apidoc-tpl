import $ from 'jquery'
import moment from 'moment'
import Handlebars from 'hbsfy/runtime'
import articleCompareParamBlock from '../templates/article-compare-param-block.hbs'
import articleCompareParamBlockBody from '../templates/article-compare-param-block-body.hbs'
import articleComparePermission from '../templates/article-compare-permission.hbs'
import articleParamBlock from '../templates/article-param-block.hbs'
import articleSampleRequest from '../templates/article-sample-request.hbs'

let templates = {
  'article-compare-param-block': articleCompareParamBlock,
  'article-compare-param-block-body': articleCompareParamBlockBody,
  'article-compare-permission': articleComparePermission,
  'article-param-block': articleParamBlock,
  'article-sample-request': articleSampleRequest
}
let DiffMatchPatch = require('diff_match_patch').diff_match_patch
let locale = {
  __: function(text) {
    return text
  }
}

/**
 * start/stop timer for simple performance check.
 */
let timer
Handlebars.registerHelper('startTimer', function(text) {
  timer = new Date()
  return ''
})

Handlebars.registerHelper('stopTimer', function(text) {
  console.log(new Date() - timer)
  return ''
})

Handlebars.registerHelper('dateFormat', function(context, block) {
  var f = block.hash.format || "MMM Do, YYYY";
  return moment(context).format(f)
})

/**
 * Return localized Text.
 * @param string text
 */
Handlebars.registerHelper('__', function(text) {
  return locale.__(text)
})

/**
 * Console log.
 * @param mixed obj
 */
Handlebars.registerHelper('cl', function(obj) {
  console.log(obj)
  return ''
})

/**
 * Replace underscore with space.
 * @param string text
 */
Handlebars.registerHelper('underscoreToSpace', function(text) {
  text = text || ''
  return text.replace(/(_+)/g, ' ')
})

Handlebars.registerHelper('assign', function(name) {
  if (arguments.length > 0) {
    let type = typeof(arguments[1])
    let arg = null
    if (type === 'string' || type === 'number' || type === 'boolean') {
      arg = arguments[1]
    }
    Handlebars.registerHelper(name, function() {
      return arg
    })
  }
  return ''
})

Handlebars.registerHelper('nl2br', function(text) {
  return _handlebarsNewlineToBreak(text)
})

Handlebars.registerHelper('if_eq', function(context, options) {
  let compare = context
  // Get length if context is an object
  if (context instanceof Object && !(options.hash.compare instanceof Object)) {
    compare = Object.keys(context).length
  }

  if (compare === options.hash.compare) {
    return options.fn(this)
  }

  return options.inverse(this)
})

Handlebars.registerHelper('if_gt', function(context, options) {
  let compare = context
  // Get length if context is an object
  if (context instanceof Object && !(options.hash.compare instanceof Object)) {
    compare = Object.keys(context).length
  }

  if (compare > options.hash.compare) {
    return options.fn(this)
  }

  return options.inverse(this)
})

let templateCache = {}
Handlebars.registerHelper('subTemplate', function(name, sourceContext) {
  let template = templates[name]
  let templateContext = $.extend({}, this, sourceContext.hash)
  return new Handlebars.SafeString(template(templateContext))
})

Handlebars.registerHelper('toLowerCase', function(value) {
  return (value && typeof value === 'string') ? value.toLowerCase() : ''
})

Handlebars.registerHelper('toUpperCase', function(value) {
  return (value && typeof value === 'string') ? value.toUpperCase() : ''
})

Handlebars.registerHelper('splitFill', function(value, splitChar, fillChar) {
  let splits = value.split(splitChar)
  return new Array(splits.length).join(fillChar) + splits[splits.length - 1]
})

/**
 * Convert Newline to HTML-Break (nl2br).
 *
 * @param {String} text
 * @returns {String}
 */
function _handlebarsNewlineToBreak(text) {
  return ('' + text).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2')
}

Handlebars.registerHelper('each_compare_list_field', function(source, compare, options) {
  let fieldName = options.hash.field
  let newSource = []
  if (source) {
    source.forEach(function(entry) {
      let values = entry
      values['key'] = entry[fieldName]
      newSource.push(values)
    })
  }

  let newCompare = []
  if (compare) {
    compare.forEach(function(entry) {
      let values = entry
      values['key'] = entry[fieldName]
      newCompare.push(values)
    })
  }
  return _handlebarsEachCompared('key', newSource, newCompare, options)
})

Handlebars.registerHelper('each_compare_keys', function(source, compare, options) {
  let newSource = []
  if (source) {
    let sourceFields = Object.keys(source)
    sourceFields.forEach(function(name) {
      let values = {}
      values['value'] = source[name]
      values['key'] = name
      newSource.push(values)
    })
  }

  let newCompare = []
  if (compare) {
    let compareFields = Object.keys(compare)
    compareFields.forEach(function(name) {
      let values = {}
      values['value'] = compare[name]
      values['key'] = name
      newCompare.push(values)
    })
  }
  return _handlebarsEachCompared('key', newSource, newCompare, options)
})

Handlebars.registerHelper('each_compare_field', function(source, compare, options) {
  return _handlebarsEachCompared('field', source, compare, options)
})

Handlebars.registerHelper('each_compare_title', function(source, compare, options) {
  return _handlebarsEachCompared('title', source, compare, options)
})

Handlebars.registerHelper('showDiff', function(source, compare, options) {
  let ds = ''
  if (source === compare) {
    ds = source
  } else {
    if (!source) {
      return compare
    }

    if (!compare) {
      return source
    }

    let d = diffMatchPatch.diff_main(compare, source)
    diffMatchPatch.diff_cleanupSemantic(d)
    ds = diffMatchPatch.diff_prettyHtml(d)
    ds = ds.replace(/&para/gm, '')
  }
  if (options === 'nl2br') {
    ds = _handlebarsNewlineToBreak(ds)
  }

  return ds
})

function _handlebarsEachCompared(fieldname, source, compare, options) {
  let dataList = []
  let index = 0
  if (source) {
    source.forEach(function(sourceEntry) {
      let found = false
      if (compare) {
        compare.forEach(function(compareEntry) {
          if (sourceEntry[fieldname] === compareEntry[fieldname]) {
            let data = {
              typeSame: true,
              source: sourceEntry,
              compare: compareEntry,
              index: index
            }
            dataList.push(data)
            found = true
            index++
          }
        })
      }
      if (!found) {
        let data = {
          typeIns: true,
          source: sourceEntry,
          index: index
        }
        dataList.push(data)
        index++
      }
    })
  }

  if (compare) {
    compare.forEach(function(compareEntry) {
      let found = false
      if (source) {
        source.forEach(function(sourceEntry) {
          if (sourceEntry[fieldname] === compareEntry[fieldname]) {
            found = true
          }
        })
      }
      if (!found) {
        let data = {
          typeDel: true,
          compare: compareEntry,
          index: index
        }
        dataList.push(data)
        index++
      }
    })
  }

  let ret = ''
  let length = dataList.length
  for (let index in dataList) {
    if (index == (length - 1)) {
      dataList[index]['_last'] = true
    }
    ret = ret + options.fn(dataList[index])
  }
  return ret
}

let diffMatchPatch = new DiffMatchPatch()

/**
 * Overwrite Colors
 */
DiffMatchPatch.prototype.diff_prettyHtml = function(diffs) {
  let html = []
  let pattern_amp = /&/g
  let pattern_lt = /</g
  let pattern_gt = />/g
  let pattern_para = /\n/g
  for (let x = 0; x < diffs.length; x++) {
    let op = diffs[x][0]    // Operation (insert, delete, equal)
    let data = diffs[x][1]  // Text of change.
    let text = data
      .replace(pattern_amp, '&amp')
      .replace(pattern_lt, '&lt')
      .replace(pattern_gt, '&gt')
      .replace(pattern_para, '&para<br>')
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins>' + text + '</ins>'
        break
      case DIFF_DELETE:
        html[x] = '<del>' + text + '</del>'
        break
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>'
        break
    }
  }
  return html.join('')
}

export default Handlebars
