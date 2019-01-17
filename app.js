var express = require('express');

var admin = require('./routes/admin');
var accounts = require('./routes/accounts');
var auth = require('./routes/auth');
var home = require('./routes/home');
var chat =require('./routes/chat');
var products = require('./routes/products');
var cart = require('./routes/cart');
var checkout = require('./routes/checkout');


var app = express();

var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//flash  메시지 관련
var flash = require('connect-flash');
 
//passport 로그인 관련
var passport = require('passport');
var session = require('express-session');

//MongoDB 접속
//mongoose promise 에러 처리
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
 
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
    console.log('mongodb connect');
});
 
var connect = mongoose.connect('mongodb://127.0.0.1:27017/fastcampus10', { useMongoClient: true });

//포트 번호 설정
var port = 3000;

//ejs 설정
// 확장자가 ejs 로 끝나는 뷰 엔진을 추가한다.
app.set('views', path.join(__dirname, 'views'));
console.log(__dirname);
app.set('view engine', 'ejs');

// 미들웨어 셋팅
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//업로드 path 추가
//파일 업로드. 웹에서 url로 접근 가능하게 설정.
app.use('/uploads', express.static('uploads'));


//업로드 path 추가
app.use('/static', express.static('static'));


//로그인 세션 적용!!
//session 관련 셋팅
var connectMongo = require('connect-mongo');
var MongoStore = connectMongo(session);
 
var sessionMiddleWare = session({
    secret: 'fastcampus',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 2000 * 60 * 60 //지속시간 2시간
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        ttl: 14 * 24 * 60 * 60
    })
});
app.use(sessionMiddleWare);
 
//passport 적용
app.use(passport.initialize());
app.use(passport.session());
 

//헤더 메뉴
//뷰에서만 글로벌로 사용할 수 있는 변수 셋팅
//플래시 메시지 관련
app.use(flash());


//로그인 정보 뷰에서만 변수로 셋팅, 전체 미들웨어는 router위에 두어야 에러가 안난다
app.use(function(req, res, next) {
    //app.locals.myname = "node js";
    app.locals.isLogin = req.isAuthenticated();
    //app.locals.urlparameter = req.url; //현재 url 정보를 보내고 싶으면 이와같이 셋팅
    app.locals.userData = req.user; //사용 정보를 보내고 싶으면 이와같이 셋팅
    next();
  });


/*
리퀘스트에 변수를 하나 추가한다.
app.use(function(){

    req.body =222222222222;
    next();
});
*/


//routing
app.use('/', home );
app.use( '/admin' , admin );
app.use('/accounts', accounts );
app.use('/auth', auth );
app.use('/chat', chat );
app.use('/products', products);
app.use('/cart', cart);
app.use('/checkout', checkout);

//static path 추가
app.use('/static', express.static('static'));



//리스너 설정
var server = app.listen ( port, function(){
    console.log('express listening on port', port);
});

var listen = require('socket.io');
var io = listen(server);

//socket io passport 접근하기 위한 미들웨어 적용
io.use(function(socket, next){
    sessionMiddleWare(socket.request, socket.request.res, next);
});

require('./libs/socketConnection')(io);

