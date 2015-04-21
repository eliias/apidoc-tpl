import _ from 'lodash'
import $ from 'jquery'
import Bootstrap from 'bootstrap'
import sampleRequest from '../vendor/send-sample-request'
import Handlebars from '../vendor/handlebars-helper'
import templateHeader from '../templates/header.hbs'
import templateFooter from '../templates/footer.hbs'
import templateArticle from '../templates/article.hbs'
import templateExample from '../templates/example.hbs'
import templateCompareArticle from '../templates/compare-article.hbs'
import templateGenerator from '../templates/generator.hbs'
import templateProject from '../templates/project.hbs'
import templateSections from '../templates/sections.hbs'
import templateSidenav from '../templates/sidenav.hbs'

let apiProject
let apiData

function init() {
  let api = apiData

  if (!apiProject.template) {
    apiProject.template = {}
  }

  if (apiProject.template.withCompare == null) {
    apiProject.template.withCompare = true
  }

  if (apiProject.template.withGenerator == null) {
    apiProject.template.withGenerator = true
  }

  $.ajaxSetup(apiProject.template.jQueryAjaxSetup)

  let apiByGroup = _.groupBy(api, function(entry) {
    return entry.group
  })

  let apiByGroupAndName = {}
  $.each(apiByGroup, function(index, entries) {
    apiByGroupAndName[index] = _.groupBy(entries, function(entry) {
      return entry.name
    })
  })

  let newList = []
  let umlauts = {
    'ä': 'ae',
    'ü': 'ue',
    'ö': 'oe',
    'ß': 'ss'
  }

  $.each(apiByGroupAndName, function(index, groupEntries) {
    // get titles from the first entry of group[].name[] (name has versioning)
    let titles = []
    $.each(groupEntries, function(titleName, entries) {
      let title = entries[0].title
      if (title !== undefined) {
        title.toLowerCase().replace(/[äöüß]/g, function($0) {
          return umlauts[$0]
        })
        titles.push(title + '#~#' + titleName) // '#~#' keep reference to titleName after sorting
      }
    })
    // sort by name ASC
    titles.sort()

    // custom order
    if (apiProject.order) {
      titles = sortByOrder(titles, apiProject.order, '#~#')
    }

    // add single elements to the new list
    titles.forEach(function(name) {
      let values = name.split('#~#')
      let key = values[1]
      groupEntries[key].forEach(function(entry) {
        newList.push(entry)
      })
    })
  })

  api = newList

  let apiGroups = {}
  let apiGroupTitles = {}
  let apiVersions = {}
  apiVersions[apiProject.version] = 1

  $.each(api, function(index, entry) {
    apiGroups[entry.group] = 1
    apiGroupTitles[entry.group] = entry.groupTitle || entry.group
    apiVersions[entry.version] = 1
  })

  apiGroups = Object.keys(apiGroups)
  apiGroups.sort()

  // custom order
  if (apiProject.order) {
    apiGroups = sortByOrder(apiGroups, apiProject.order)
  }

  // sort versions DESC
  apiVersions = Object.keys(apiVersions)
  apiVersions.sort()
  apiVersions.reverse()

  let nav = []
  apiGroups.forEach(function(group) {
    // Mainmenu entry
    nav.push({
      group: group,
      isHeader: true,
      title: apiGroupTitles[group]
    })

    // Submenu
    let oldName = ''
    api.forEach(function(entry) {
      if (entry.group === group) {
        if (oldName !== entry.name) {
          nav.push({
            title: entry.title,
            group: group,
            name: entry.name,
            type: entry.type,
            version: entry.version
          })
        } else {
          nav.push({
            title: entry.title,
            group: group,
            hidden: true,
            name: entry.name,
            type: entry.type,
            version: entry.version
          })
        }
        oldName = entry.name
      }
    })
  })

  // Mainmenu Header entry
  if (apiProject.header) {
    nav.unshift({
      group: '_',
      isHeader: true,
      title: (apiProject.header.title == null) ? locale.__('General') : apiProject.header.title,
      isFixed: true
    })
  }

  // Mainmenu Footer entry
  if (apiProject.footer && apiProject.footer.title != null) {
    nav.push({
      group: '_footer',
      isHeader: true,
      title: apiProject.footer.title,
      isFixed: true
    })
  }

  // render pagetitle
  let title = apiProject.title ? apiProject.title : 'apiDoc: ' + apiProject.name + ' - ' + apiProject.version
  $(document).attr('title', title)

  // remove loader
  $('#loader').remove()

  // render sidenav
  let fields = {nav: nav}
  $('#sidenav').append(templateSidenav(fields))

  // render Generator
  $('#generator').append(templateGenerator(apiProject))

  // render Project
  _.extend(apiProject, {versions: apiVersions})
  $('#project').append(templateProject(apiProject))

  // render apiDoc, header/footer documentation
  if (apiProject.header) {
    $('#header').append(templateHeader(apiProject.header))
  }

  if (apiProject.footer) {
    $('#footer').append(templateFooter(apiProject.footer))
  }

  let articleVersions = {}
  let content = ''

  apiGroups.forEach(function(groupEntry) {
    let articles = []
    let oldName = ''
    let fields = {}
    let title = groupEntry
    let description = ''
    articleVersions[groupEntry] = {}

    // render all articles of a group
    api.forEach(function(entry) {
      if (groupEntry === entry.group) {
        if (oldName !== entry.name) {
          // determine versions
          api.forEach(function(versionEntry) {
            if (groupEntry === versionEntry.group && entry.name === versionEntry.name) {
              if (!articleVersions[entry.group][entry.name]) {
                articleVersions[entry.group][entry.name] = []
              }

              articleVersions[entry.group][entry.name].push(versionEntry.version)
            }
          })
          fields = {
            article: entry,
            versions: articleVersions[entry.group][entry.name]
          }
        } else {
          fields = {
            article: entry,
            hidden: true,
            versions: articleVersions[entry.group][entry.name]
          }
        }

        // add prefix URL for endpoint
        if (apiProject.url) {
          fields.article.url = apiProject.url + fields.article.url
        }

        addArticleSettings(fields, entry)

        if (entry.groupTitle) {
          title = entry.groupTitle
        }

        // TODO: make groupDescription compareable with older versions (not important for the moment)
        if (entry.groupDescription) {
          description = entry.groupDescription
        }

        articles.push({
          article: templateArticle(fields),
          example: templateExample(fields),
          group: entry.group,
          name: entry.name
        })
        oldName = entry.name
      }
    })

    // render section with articles
    fields = {
      group: groupEntry,
      title: title,
      description: description,
      articles: articles
    }
    content += templateSections(fields)
  })
  $('#sections').append(content)

  let $scrollSpy = $('body').scrollspy({
    target: '#scrollingNav',
    offset: 18
  })
  $('[data-spy="scroll"]').each(function() {
    $scrollSpy('refresh')
  })

  // Content-Scroll on Navigation click.
  $('.sidenav').find('a').on('click', function(e) {
    e.preventDefault()
    let id = $(this).attr('href')
    if ($(id).length > 0) {
      $('html,body').animate({scrollTop: parseInt($(id).offset().top)}, 400)
    }
    window.location.hash = $(this).attr('href')
  })

  // Quickjump on Pageload to hash position.
  if (window.location.hash) {
    let id = window.location.hash
    if ($(id).length > 0) {
      $('html,body').animate({scrollTop: parseInt($(id).offset().top)}, 0)
    }
  }

  /**
   * Check if Parameter (sub) List has a type Field.
   * Example: @apiSuccess          varname1 No type.
   *          @apiSuccess {String} varname2 With type.
   *
   * @param {Object} fields
   */
  function _hasTypeInFields(fields) {
    let result = false
    $.each(fields, function(name) {
      if (_.any(fields[name], function(item) {
          return item.type
        })) {
        result = true
      }
    })
    return result
  }

  /**
   * On Template changes, recall plugins.
   */
  function initDynamic() {
    // bootstrap popover
    $('a[data-toggle=popover]')
      .popover()
      .click(function(e) {
        e.preventDefault()
      })

    let version = $('#version strong').html()
    $('#sidenav li').removeClass('is-new')
    if (apiProject.template.withCompare) {
      $('#sidenav li[data-version=\'' + version + '\']').each(function() {
        let group = $(this).data('group')
        let name = $(this).data('name')
        let length = $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\']').length
        let index = $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\']').index($(this))
        if (length === 1 || index === (length - 1)) {
          $(this).addClass('is-new')
        }
      })
    }

    // tabs
    $('.nav-tabs-examples a').click(function(e) {
      e.preventDefault()
      $(this).tab('show')
    })
    $('.nav-tabs-examples').find('a:first').tab('show')

    // sample request switch
    $('.sample-request-switch').click(function(e) {
      let name = '.' + $(this).attr('name') + '-fields'
      $(name).addClass('hide')
      $(this).parent().next(name).removeClass('hide')
    })

    // init modules
    sampleRequest.initDynamic()
  }

  initDynamic()

  //
  // HTML-Template specific jQuery-Functions
  //
  // Change Main Version
  $('#versions li.version a').on('click', function(e) {
    e.preventDefault()

    let selectedVersion = $(this).html()
    $('#version strong').html(selectedVersion)

    // hide all
    $('article').addClass('hide')
    $('#sidenav li:not(.nav-fixed)').addClass('hide')

    // show 1st equal or lower Version of each entry
    $('article[data-version]').each(function(index) {
      let group = $(this).data('group')
      let name = $(this).data('name')
      let version = $(this).data('version')

      if (version <= selectedVersion) {
        if ($('article[data-group=\'' + group + '\'][data-name=\'' + name + '\']:visible').length === 0) {
          // enable Article
          $('article[data-group=\'' + group + '\'][data-name=\'' + name + '\'][data-version=\'' + version + '\']').removeClass('hide')
          // enable Navigation
          $('#sidenav li[data-group=\'' + group + '\'][data-name=\'' + name + '\'][data-version=\'' + version + '\']').removeClass('hide')
          $('#sidenav li.nav-header[data-group=\'' + group + '\']').removeClass('hide')
        }
      }
    })

    initDynamic()
  })

  $('#compareAllWithPredecessor').on('click', changeAllVersionCompareTo)

  $('article .versions li.version a').on('click', changeVersionCompareTo)

  // compare url-parameter
  $.urlParam = function(name) {
    let results = new RegExp('[\\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href)
    return (results && results[1]) ? results[1] : null
  }

  if ($.urlParam('compare')) {
    // URL Paramter ?compare=1 is set
    $('#compareAllWithPredecessor').trigger('click')

    if (window.location.hash) {
      let id = window.location.hash
      $('html,body').animate({scrollTop: parseInt($(id).offset().top) - 18}, 0)
    }
  }

  /**
   * Change version of an article to compare it to an other version.
   */
  function changeVersionCompareTo(e) {
    e.preventDefault()

    let $root = $(this).parents('article')
    let selectedVersion = $(this).html()
    let $button = $root.find('.version')
    let currentVersion = $button.find('strong').html()
    $button.find('strong').html(selectedVersion)

    let group = $root.data('group')
    let name = $root.data('name')
    let version = $root.data('version')

    let compareVersion = $root.data('compare-version')

    if (compareVersion === selectedVersion) {
      return
    }

    if (!compareVersion && version == selectedVersion) {
      return
    }

    if (compareVersion && articleVersions[group][name][0] === selectedVersion || version === selectedVersion) {
      // the version of the entry is set to the highest version (reset)
      resetArticle(group, name, version)
    } else {
      let sourceEntry = {}
      let compareEntry = {}
      $.each(apiByGroupAndName[group][name], function(index, entry) {
        if (entry.version === version) {
          sourceEntry = entry
        }
        if (entry.version === selectedVersion) {
          compareEntry = entry
        }
      })

      let fields = {
        article: sourceEntry,
        compare: compareEntry,
        versions: articleVersions[group][name]
      }

      // add unique id
      fields.article.id = fields.article.group + '-' + fields.article.name + '-' + fields.article.version
      fields.article.id = fields.article.id.replace(/\./g, '_')

      fields.compare.id = fields.compare.group + '-' + fields.compare.name + '-' + fields.compare.version
      fields.compare.id = fields.compare.id.replace(/\./g, '_')

      let entry = sourceEntry
      if (entry.parameter && entry.parameter.fields) {
        fields._hasTypeInParameterFields = _hasTypeInFields(entry.parameter.fields)
      }

      if (entry.error && entry.error.fields) {
        fields._hasTypeInErrorFields = _hasTypeInFields(entry.error.fields)
      }

      if (entry.success && entry.success.fields) {
        fields._hasTypeInSuccessFields = _hasTypeInFields(entry.success.fields)
      }

      if (entry.info && entry.info.fields) {
        fields._hasTypeInInfoFields = _hasTypeInFields(entry.info.fields)
      }

      entry = compareEntry
      if (fields._hasTypeInParameterFields !== true && entry.parameter && entry.parameter.fields) {
        fields._hasTypeInParameterFields = _hasTypeInFields(entry.parameter.fields)
      }

      if (fields._hasTypeInErrorFields !== true && entry.error && entry.error.fields) {
        fields._hasTypeInErrorFields = _hasTypeInFields(entry.error.fields)
      }

      if (fields._hasTypeInSuccessFields !== true && entry.success && entry.success.fields) {
        fields._hasTypeInSuccessFields = _hasTypeInFields(entry.success.fields)
      }

      if (fields._hasTypeInInfoFields !== true && entry.info && entry.info.fields) {
        fields._hasTypeInInfoFields = _hasTypeInFields(entry.info.fields)
      }

      let content = templateCompareArticle(fields)
      $root.after(content)
      let $content = $root.next()

      // Event on.click re-assign
      $content.find('.versions li.version a').on('click', changeVersionCompareTo)

      // select navigation
      $('#sidenav li[data-group="' + group + '"][data-name="' + name + '"][data-version="' + currentVersion + '"]').addClass('has-modifications')

      $root.remove()
    }

    initDynamic()
  }

  /**
   * Compare all currently selected Versions with their predecessor.
   */
  function changeAllVersionCompareTo(e) {
    e.preventDefault()
    $('article:visible .versions').each(function() {
      let $root = $(this).parents('article')
      let currentVersion = $root.data('version')
      let $foundElement = null
      $(this).find('li.version a').each(function() {
        let selectVersion = $(this).html()
        if (selectVersion < currentVersion && !$foundElement) {
          $foundElement = $(this)
        }
      })

      if ($foundElement) {
        $foundElement.trigger('click')
      }
    })

    initDynamic()
  }

  function addArticleSettings(fields, entry) {
    fields.id = fields.article.group + '-' + fields.article.name + '-' + fields.article.version
    fields.id = fields.id.replace(/\./g, '_')

    if (entry.header && entry.header.fields) {
      fields._hasTypeInHeaderFields = _hasTypeInFields(entry.header.fields)
    }

    if (entry.parameter && entry.parameter.fields) {
      fields._hasTypeInParameterFields = _hasTypeInFields(entry.parameter.fields)
    }

    if (entry.error && entry.error.fields) {
      fields._hasTypeInErrorFields = _hasTypeInFields(entry.error.fields)
    }

    if (entry.success && entry.success.fields) {
      fields._hasTypeInSuccessFields = _hasTypeInFields(entry.success.fields)
    }

    if (entry.info && entry.info.fields) {
      fields._hasTypeInInfoFields = _hasTypeInFields(entry.info.fields)
    }

    // add template settings
    fields.template = apiProject.template
  }

  function renderArticle(group, name, version) {
    let entry = {}
    $.each(apiByGroupAndName[group][name], function(index, currentEntry) {
      if (currentEntry.version === version) {
        entry = currentEntry
      }
    })

    let fields = {
      article: entry,
      versions: articleVersions[group][name]
    }

    addArticleSettings(fields, entry)

    return templateArticle(fields)
  }

  function resetArticle(group, name, version) {
    let $root = $('article[data-group="' + group + '"][data-name="' + name + '"]:visible')
    let content = renderArticle(group, name, version)

    $root.after(content)
    let $content = $root.next()

    $content.find('.versions li.version a').on('click', changeVersionCompareTo)

    $('#sidenav li[data-group="' + group + '"][data-name="' + name + '"][data-version="' + version + '"]').removeClass('has-modifications')

    $root.remove()
  }

  /**
   * Return ordered entries by custom order and append not defined entries to the end.
   * @param  {String[]} elements
   * @param  {String[]} order
   * @param  {String}   splitBy
   * @return {String[]} Custom ordered list.
   */
  function sortByOrder(elements, order, splitBy) {
    let results = []
    order.forEach(function(name) {
      if (splitBy) {
        elements.forEach(function(element) {
          let parts = element.split(splitBy)
          let key = parts[1] // reference keep for sorting
          if (key == name) {
            results.push(element)
          }
        })
      } else {
        elements.forEach(function(key) {
          if (key == name) {
            results.push(name)
          }
        })
      }
    })
    // Append all other entries that ar not defined in order
    elements.forEach(function(element) {
      if (results.indexOf(element) === -1) {
        results.push(element)
      }
    })

    return results
  }

  global.Prism.highlightAll()

}

$.when(
  $.getJSON('../api_project.json', function(project) {
    apiProject = project
  }),
  $.getJSON('../api_data.json', function(data) {
    apiData = data
  })
).then(init)
