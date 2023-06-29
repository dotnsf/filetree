//. app.js

var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    app = express();

require( 'dotenv' ).config();

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
//app.use( express.static( __dirname + '/public' ) );

var settings_cors = 'CORS' in process.env ? process.env.CORS : '';
if( settings_cors ){
  app.all( '/*', function( req, res, next ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
    next();
  });
}
app.use( express.static( __dirname + '/public' ) );


var tree = [
//. { id: 'aaa', folderpath: '/', name: 'folder', folder: 1 },
//. { id: 'bbb', folderpath: '/folder/', name: 'subfolder', folder: 1 },
//. { id: 'ccc', folderpath: '/folder/subfolder/', name: 'test.txt', data: 'This is test.', folder: 0 },
//. { id: 'ddd', folderpath: '/folder/subfolder/', name: 'subsubfolder', folder: 1 },
//. { id: 'eee', folderpath: '/folder/subfolder/subsubfolder/', name: 'test.txt', data: 'This is test, too.', folder: 0 }
];

//. 一覧
app.get( '/api/tree', function( req, res ){
  res.contentType( 'application/json; charaset=utf-8' );

  var folderpath = req.query.folderpath;
  if( folderpath ){
    folderpath = normalizeFolderPath( folderpath );

    //. そのフォルダは存在しているか？
    if( isFolderExisted( folderpath ) > -1 ){
      //. そのフォルダが存在していた場合、
      var filter = req.query.filter;
      var files = [];
      for( var i = 0; i < tree.length; i ++ ){
        if( tree[i].folderpath == folderpath ){
          if( filter ){
            if( tree[i].name.indexOf( filter ) > -1 || ( tree[i].folder == 0 && tree[i].data.indexOf( filter ) > -1 ) ){
              files.push( tree[i] );
            }
          }else{
            files.push( tree[i] );
          }
        }
      }

      res.write( JSON.stringify( { status: true, files: files, folderpath: folderpath } ) );
      res.end();
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'no such folder: ' + folderpath } ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'query folderpath need to be specified.' } ) );
    res.end();
  }
});

//. 追加 
app.post( '/api/tree', function( req, res ){
  res.contentType( 'application/json; charaset=utf-8' );

  var body = req.body;
  if( 'folderpath' in body && body.folderpath && 'name' in body && body.name && body.name.indexOf( '/' ) == -1 && 'folder' in body ){
    var folderpath = normalizeFolderPath( body.folderpath );

    //. そのフォルダは存在しているか？
    if( isFolderExisted( folderpath ) > -1 ){
      body = {};
      body.folderpath = folderpath;
      body.name = req.body.name;
      body.folder = req.body.folder;
      if( typeof body.folder == 'string' ){ body.folder = parseInt( body.folder ); }
      if( 'data' in req.body ){ body.data = req.body.data; }

      //. 同じフォルダと名前の要素が存在していないか？
      var exists = false;
      for( var i = 0; i < tree.length && !exists; i ++ ){
        if( tree[i].folderpath == body.folderpath && tree[i].name == body.name ){
          exists = true;
        }
      }

      if( exists ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, error: 'same folder/name data already existed: ' + body.folderpath + body.name } ) );
        res.end();
      }else{
        res.write( JSON.stringify( { status: true, body: body } ) );
        res.end();
      }
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'no such folder: ' + body.folderpath } ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'folderpath, name, and folder are all need to be specified.' } ) );
    res.end();
  }
});

//. 削除
app.delete( '/api/tree', function( req, res ){
  res.contentType( 'application/json; charaset=utf-8' );

  var path = req.query.path;
  if( path ){
    //. まずフォルダで調べる
    var folderpath = normalizeFolderPath( path );

    //. そのフォルダは存在しているか？
    var idx = isFolderExisted( folderpath );
    if( idx > -1 ){
      //. フォルダ内にファイル／フォルダが存在しているか？
      var exists = false;
      for( var i = 0; i < tree.length && !exists; i ++ ){
        if( tree[i].folderpath == folderpath ){
          exists = true;
        }
      }

      if( exists ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, error: 'some files/folders existed under ' + path } ) );
        res.end();
      }else{
        //. フォルダを削除する
        tree.splice( idx, 1 );

        res.write( JSON.stringify( { status: true, path: path } ) );
        res.end();
      }
    }else{
      //. ファイルで調べる
      if( !path.endsWith( '/' ) ){
        var tmp = path.split( '/' );
        var folder = '';
        var name = tmp.pop();
        if( tmp.length == 1 ){
          folder = '/';
        }else{
          folder = tmp.join( '/' ) + '/';
        }

        var idx = -1;
        for( var i = 0; i < tree.length && idx == -1; i ++ ){
          if( tree[i].folder == 0 && tree[i].folderpath == folder && tree[i].name == name ){
            idx = i;
          }
        }

        if( idx > -1 ){
          //. ファイルを削除する
          tree.splice( idx, 1 );

          res.write( JSON.stringify( { status: true, path: path } ) );
          res.end();
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, error: 'no file path existed: ' + path } ) );
          res.end();
        }
      }else{
        res.status( 400 );
        res.write( JSON.stringify( { status: false, error: 'no folder path existed: ' + path } ) );
        res.end();
      }
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'query path need to be specified.' } ) );
    res.end();
  }
});



//. フォルダ名の正規化
function normalizeFolderPath( folderpath ){
  if( !folderpath.endsWith( '/' ) ){
    folderpath = folderpath + '/';
  }
  if( !folderpath.startsWith( '/' ) ){
    folderpath = '/' + folderpath;
  }

  return folderpath;
}

//. そのフォルダは存在しているか？
function isFolderExisted( folderpath ){
  var idx = -1;

  var folder = '';
  var name = '';
  var tmp = folderpath.split( '/' );
  if( tmp.length == 2 ){
    //. ルートフォルダ（絶対に存在している）
    folder_exists = true;
  }else{
    //. ルート以外のフォルダ
    tmp.pop();
    name = tmp.pop();
    if( tmp.length == 1 ){
      folder = '/';
    }else{
      folder = tmp.join( '/' ) + '/';
    }

    for( var i = 0; i < tree.length && idx == -1; i ++ ){
      if( tree[i].folder == 1 && tree[i].folderpath == folder && tree[i].name == name ){
        idx = i;
      }
    }
  }

  return idx;
}

function timestamp2date( ts ){
  if( ts ){
    var dt = new Date( ts );
    var yyyy = dt.getFullYear();
    var mm = dt.getMonth() + 1;
    var dd = dt.getDate();
    var hh = dt.getHours();
    var nn = dt.getMinutes();
    var ss = dt.getSeconds();
    var datetime = yyyy + '-' + ( mm < 10 ? '0' : '' ) + mm + '-' + ( dd < 10 ? '0' : '' ) + dd 
      + '<br/>' + ( hh < 10 ? '0' : '' ) + hh + ':' + ( nn < 10 ? '0' : '' ) + nn + ':' + ( ss < 10 ? '0' : '' ) + ss;
    return datetime;
  }else{
    return "";
  }
}

function timestamp2datetime( ts ){
  if( ts ){
    var dt = new Date( ts );
    var yyyy = dt.getFullYear();
    var mm = dt.getMonth() + 1;
    var dd = dt.getDate();
    var hh = dt.getHours();
    var nn = dt.getMinutes();
    var ss = dt.getSeconds();
    var datetime = yyyy + '-' + ( mm < 10 ? '0' : '' ) + mm + '-' + ( dd < 10 ? '0' : '' ) + dd
      + ' ' + ( hh < 10 ? '0' : '' ) + hh + ':' + ( nn < 10 ? '0' : '' ) + nn + ':' + ( ss < 10 ? '0' : '' ) + ss;
    return datetime;
  }else{
    return "";
  }
}

function sortByDay( a, b ){
  var r = 0;
  if( a.d < b.d ){
    r = -1;
  }else if( a.d > b.d ){
    r = 1;
  }

  return r;
}

function sortByCreated( a, b ){
  var r = 0;
  if( a.created < b.created ){
    r = -1;
  }else if( a.created > b.created ){
    r = 1;
  }

  return r;
}

function sortByCreatedRev( a, b ){
  var r = 0;
  if( a.created < b.created ){
    r = 1;
  }else if( a.created > b.created ){
    r = -1;
  }

  return r;
}


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
