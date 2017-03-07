var gulp = require('gulp');
var ts = require('gulp-typescript');
var del = require('del');
var merge2 = require('merge2');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var jasmine = require('gulp-jasmine')
var istanbul = require("gulp-istanbul");

gulp.task('build:ts', () => {
    var tsProject = ts.createProject('tsconfig.json', { declaration: true, sortOutput: true });

    var tsResult = tsProject.src()
        .pipe(ts(tsProject));

    return merge2(
        tsResult.js
            .pipe(gulp.dest('lib')),
        tsResult.dts
            .pipe(gulp.dest('typings')));
});

gulp.task('build:browserify', ['build:ts'], () => {
	var b = browserify({ debug: true });
	b.require("./lib/index.js", {
		expose: '@cross-border-bridge/data-channel'
	});
	return b.bundle()
		.pipe(source('data-channel.js'))
		.pipe(gulp.dest('build'))
});

gulp.task('build', ['build:ts', 'build:browserify']);

gulp.task('clean', del.bind(null, ["./lib", "./typings"]))

gulp.task('test', () => {
    gulp.src("lib/**/*.js")
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
        .on("finish",function(){
            gulp.src("spec/**/*Spec.js")
            .pipe(jasmine())
            .on('error', process.exit.bind(process, 1))
            .pipe(istanbul.writeReports());
        });
});
