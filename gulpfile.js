

/********************* Variables ******************/

var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-clean-css'),
    uglify = require('gulp-uglify-es').default,
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    fs = require('fs'),
    argv = require('yargs').argv,
    strip = require('gulp-strip-comments'),
    insert = require('gulp-insert'),
    bump = require('gulp-bump'),
    mysqldump = require('mysqldump');

var pkg = require('./package.json');
var banner = '/* Version: % */';

// Configure output files...

var jsOutput, cssOutput, versionOutput;


//not a wordpress site
jsOutput = 'public/library/js';
cssOutput = 'public/library/css';
versionOutput = 'public/library/version.txt';





/********************* Gulp tasks ******************/



gulp.task('mysql-init', function(done) {
    if (typeof argv.p === 'undefined') {
        argv.p = 'root';
        console.log('NOTICE: Database root password not set, using "root" as password.');
        console.log('Usage: gulp init -p <mysql root password> [-e <environment.json name>]');

    }

    var env = argv.e;
    if (typeof env === 'undefined') env = 'default';

    var settings = JSON.parse(fs.readFileSync('environment.json', 'utf8'));
    if (typeof settings[env] === 'undefined') {
        console.log('ERROR: Environment \'' + env + '\' could not be found in environments.json.');
        console.log('Usage: gulp init -p <mysql root password> [-e <environment.json name>]');

        return;
    }


    console.log('Initialising DB...');

    var mysql = require('mysql');
    var connsettings = {
        host: settings[env].db.host,
        user: 'root',
        password: argv.p,
        multipleStatements: true
    };

    var connection = mysql.createConnection(connsettings);



    var sql = '';
    sql += "DROP DATABASE IF EXISTS `" + settings[env].db.database + "`;\n";
    sql += "CREATE DATABASE `" + settings[env].db.database + "` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;\n";
    sql += "GRANT ALL PRIVILEGES ON `" + settings[env].db.database + "`.* TO '" + settings[env].db.user + "'@'localhost' IDENTIFIED BY '" + settings[env].db.password + "';\n";
    sql += "FLUSH PRIVILEGES;\n";
    sql += "SET GLOBAL max_allowed_packet=1073741824;\n";

    //console.log(sql);

    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            done();
            return;
        }
        console.log('connected as id ' + connection.threadId + ', creating schema and user...');
        connection.query(sql, function (err, results) {
            if (err) {
                console.error('error: ' + err.stack);
                connection.end();
                done();
                return;
            }
            console.log('done');
            connection.end();

            done();
        });
    });

});


gulp.task('mysql-push', function(done){
    var settings = JSON.parse(fs.readFileSync('environment.json', 'utf8'));
    var env = argv.e;
    if (typeof env === 'undefined') env = 'default';
    var mysql = require('mysql');
    var connsettings = {
        host: settings[env].db.host,
        user: settings[env].db.user,
        password: settings[env].db.password,
        database: settings[env].db.database,
        multipleStatements: true
    };


    console.log('Executing SQL file...');

    fs.readFile(__dirname + '/db/dump.sql', 'utf8', function (err, data) {
        if (err) {
            console.error('error: ' + err.stack);
            done();
            return;
        }


        var connection = mysql.createConnection(connsettings);
        connection.query(data, function (err, results) {
            if (err) {
                console.error('error: ' + err.stack);
                connection.end();
                done();
                return;
            }
            console.log('done.');
            connection.end();
            done();
        });
    });
});

gulp.task('mysql-pull', function(done){
    var settings = JSON.parse(fs.readFileSync('environment.json', 'utf8'));
    var env = argv.e;
    if (typeof env === 'undefined') env = 'default';
    var options = {
        connection: {
            host: settings[env].db.host,
            user: settings[env].db.user,
            password: settings[env].db.password,
            database: settings[env].db.database
        },
        dump: {
            schema: {
                table: {
                    dropIfExist: true
                }
            }
        },
        dumpToFile: './db/dump.sql'
    };
    mysqldump(options).then(function(){
    });
    done();
});

gulp.task('styles', function() {
    var sass = require('gulp-sass');

    return gulp.src(pkg.tmp2k.styleFile)
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(autoprefixer('last 2 version'))
        .pipe(rename({suffix: '.min'}))
        .pipe(minifycss())
        .pipe(strip.text())
        .pipe(insert.prepend(banner.replace(/%/,pkg.version)))
        .pipe(gulp.dest(cssOutput));
});

gulp.task('styles-dev', function() {
    var sass = require('gulp-sass');

    return gulp.src(pkg.tmp2k.styleFile)
        .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
        .pipe(autoprefixer('last 2 version'))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(cssOutput));
});





gulp.task('scripts', function() {
    return gulp.src(pkg.tmp2k.scriptFiles)
        .pipe(concat('frontend-final.js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(insert.prepend(banner.replace(/%/,pkg.version)))
        .pipe(gulp.dest(jsOutput));
});

gulp.task('scripts-dev', function() {
    return gulp.src(pkg.tmp2k.scriptFiles)
        .pipe(concat('frontend-final.js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(jsOutput));
});


gulp.task('bump', function(){
    return gulp.src('./package.json')
        .pipe(bump())
        .pipe(gulp.dest('./')).on('end', function(){
            delete require.cache[require.resolve('./package.json')];
            pkg = require('./package.json');
            fs.writeFileSync(versionOutput, pkg.version);
        });


});

function watchFiles() {

    // Watch .scss files
    gulp.watch('assets/sass/**/*.scss', gulp.series('styles-dev'));

    // Watch .js files
    gulp.watch('assets/js/**/*.js', gulp.series('scripts-dev'));

    // Create LiveReload server

    // Watch any files in dist/, reload on change
    //gulp.watch(['public/wp-content/themes/'+pkg.tmp2k.wpThemeName+'**','templates']).on('change', livereload.changed);
}



gulp.task('publish',
    gulp.series('bump',gulp.parallel('styles','scripts'))
);

gulp.task('default',
    gulp.parallel('styles-dev','scripts-dev')
);


gulp.task('watch', watchFiles);

gulp.task('initdb',
    gulp.series('mysql-init','mysql-push')
);

gulp.task('exportdb',
    gulp.series('mysql-pull')
);

gulp.task('importdb',
    gulp.series('mysql-push')
);