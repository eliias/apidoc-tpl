'use strict'

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt)
  require('time-grunt')(grunt)

  let config = {
    src: './',
    dist: './dist'
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    config: config,

    clean: {
      all: ['<%= config.dist %>']
    },

    copy: {
      all: {
        files: [
          {
            expand: true,
            src: ['<%= config.src %>/fonts/**'],
            dest: '<%= config.dist %>/'
          },
          {
            expand: true,
            src: ['<%= config.src %>/images/**'],
            dest: '<%= config.dist %>/'
          },
          {
            expand: true,
            src: ['<%= config.src %>/locales/**'],
            dest: '<%= config.dist %>/'
          },
          {
            expand: true,
            src: ['<%= config.src %>/vendor/**'],
            dest: '<%= config.dist %>/'
          },
          {
            src: '<%= config.src %>/index.html',
            dest: '<%= config.dist %>/'
          }
        ]
      }
    },

    watch: {
      scripts: {
        files: ['<%= config.src %>/scripts/**/*.js'],
        tasks: ['jshint']
      },
      styles: {
        files: ['<%= config.src %>/styles/**'],
        tasks: ['less:watch']
      },
      static: {
        files: [
          '<%= config.src %>/images/**',
          '<%= config.src %>/locales/**',
          '<%= config.src %>/vendor/**',
          '<%= config.src %>/index.html',
        ],
        tasks: ['copy']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      }
    },

    browserify: {
      watch: {
        files: {
          '<%= config.dist %>/scripts/main.js': '<%= config.src %>/scripts/main.js'
        },
        options: {
          watch: true,
          transform: [
            ['babelify']
          ],
          browserifyOptions: {
            debug: true,
            sourceMap: true,
            extensions: ['.jsx']
          }
        }
      },
      all: {
        files: {
          '<%= config.dist %>/scripts/main.js': [
            '<%= config.src %>/scripts/main.js'
          ]
        },
        options: {
          transform: [
            ['babelify']
          ],
          browserifyOptions: {
            debug: false,
            sourceMap: false,
            extensions: ['.jsx']
          }
        }
      }
    },

    less: {
      watch: {
        options: {
          strictImports: true,
          strictUnits: true,
          sourceMap: true,
          sourceMapURL: 'main.css.map',
          sourceMapBasepath: './styles',
          sourceMapRootpath: '/'
        },
        paths: ['<%= config.src %>/styles'],
        plugins: [
          new (require('less-plugin-autoprefix'))({browsers: ['last 2 versions']}),
          new (require('less-plugin-clean-css'))({advanced: true})
        ],
        files: {
          '<%= config.dist %>/styles/main.css': '<%= config.src %>/styles/main.less'
        }
      },
      all: {
        options: {
          compress: true,
          strictImports: true,
          strictUnits: true,
          sourceMap: false
        },
        paths: ['<%= config.src %>/styles'],
        plugins: [
          new (require('less-plugin-autoprefix'))({browsers: ['last 2 versions']}),
          new (require('less-plugin-clean-css'))({advanced: true})
        ],
        files: {
          '<%= config.dist %>/styles/main.css': '<%= config.src %>/styles/main.less'
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= config.src %>/public/scripts/**/*.js']
    }

  })

  grunt.registerTask('dev', 'Run dev env', function() {
    grunt.task.run(['browserify:watch', 'watch'])
  })

  grunt.registerTask('default', [
    'clean',
    'copy',
    'less:all',
    'jshint',
    'browserify:all',
  ])

}
