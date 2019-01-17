
//express모듈 
var express = require ('express');

//express의 라우터 모듈
var router = express.Router();

//프로덕트 모델 몽구스 객체 불러오기
var ProductsModel = require('../models/ProductsModel');
//콘텐츠 모델 몽구스 객체 불러오기
var CommentsModel = require('../models/CommentsModel');   

//var adminRequired = require('../libs/adminRequired');
//관리자 로그인 인 경우
var adminRequired = require('../libs/adminRequired');
	
var CheckoutModel = require('../models/CheckoutModel');


//콜백 헬 개선
var co = require('co');

//페이지 네이트
var paginate  = require('express-paginate');

// csrf 셋팅
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });

//이미지 저장되는 위치 설정
var path = require('path');
var uploadDir = path.join( __dirname , '../uploads' ); // 루트의 uploads위치에 저장한다.
var fs = require('fs');

//파일 업로드
//multer 셋팅 및 저장 폴더 파일이름 규칙 생성
var multer = require('multer');
var storage = multer.diskStorage({

    //이미지가 저장되는 도착지 지정
    destination : function (req, file, callback){

        callback(null, uploadDir);
    },
    // products-날짜.jpg(png)지정
    filename : function(req, file, callback){

        callback(null, 'products-'+ Date.now()+'.'+file.mimetype.split('/')[1] );
    }
});

var upload = multer({storage:storage});

/*
function testMiddleWare(req, res, next){

    if(req.user.username == "admin"){

        next();
    }
    else{
        res.redirect('/login');
    }

    console.log('미들웨어 작동');
    next();
}

function testMiddleWare2(req, res, next){

    console.log('미들웨어2 작동');
    next();
}
*/


//route index page
router.get( '/', function(req, res){
    res.send('admin url');
});

//route 제품 페이지
router.get('/products', adminRequired, paginate.middleware(3, 50), async (req,res) => {
 
    const [ results, itemCount ] = await Promise.all([
        ProductsModel.find().sort('-created_at').limit(req.query.limit).skip(req.skip).exec(),
        ProductsModel.count({}) //총 페이지 갯수
    ]);

    //총 보여질 갯수
    const pageCount = Math.ceil(itemCount / req.query.limit);
    
    //4는 하단 4개 창
    const pages = paginate.getArrayPages(req)( 4 , pageCount, req.query.page);
 
    res.render('admin/products', { 
        products : results , 
        pages: pages,
        pageCount : pageCount,
    });
 
});

//제품 등록 route
//csuf 적용.
router.get('/products/write', adminRequired, csrfProtection , function(req,res){
    //edit에서도 같은 form을 사용하므로 빈 변수( product )를 넣어서 에러를 피해준다
    res.render( 'admin/form', {product :"", csrfToken : req.csrfToken() } );
});

//제품 등록 db 저장
//vallidation 체크한다.
//csrf적용. post받는 부분에서 콜백 함수 전 호출
//thumbnail 필드명 저장한다.
router.post('/products/write', adminRequired, upload.single('thumbnail'), csrfProtection, function(req,res){
    
    console.log(req.file);
   
    var product = new ProductsModel({
        name : req.body.name,
        thumbnail : (req.file) ? req.file.filename : "", //섬 네일 추가
        price : req.body.price,
        description : req.body.description,
        username : req.user.username
    });

    if(! product.validateSync()){
        product.save(function(err){
            //저장 후 제품 등록 페이지로 리디렉트
            res.redirect('/admin/products');
        });
    }
});

//상세 페이지 route
//댓글을 첫페이지 로딩시 리스트에서 불러오도록 적용한다.
// router.get('/products/detail/:id' , function(req, res){
//     //url 에서 변수 값을 받아올떈 req.params.id 로 받아온다
//     ProductsModel.findOne( { 'id' :  req.params.id } , function(err ,product){
//         //제품정보를 받고 그안에서 댓글을 받아온다.
//         CommentsModel.find({ product_id : req.params.id } , function(err, comments){
//             res.render('admin/productsDetail', { product: product , comments : comments });
//         });        
//     });
// });


//상세 페이지 route
//댓글을 첫페이지 로딩시 리스트에서 불러오도록 적용한다.
// router.get('/products/detail/:id' , function(req, res){

//     var getData = co(function* (){
//         var product = yield ProductsModel.findOne( { 'id' :  req.params.id }).exec();
//         var comments = yield CommentsModel.find( { 'product_id' :  req.params.id }).exec();
//         return {
//             product : product,
//             comments : comments
//         };
//     });
//     getData.then( function(result){
//         res.render('admin/productsDetail', { product: result.product , comments : result.comments });
// });

//상세 페이지 route
//댓글을 첫페이지 로딩시 리스트에서 불러오도록 적용한다.
// router.get('/products/detail/:id' , function(req, res){
//     //url 에서 변수 값을 받아올떈 req.params.id 로 받아온다
//     var getData = async ()=>{
//         return {
//             product : await ProductsModel.findOne( { 'id' :  req.params.id }).exec(),
//             comments : await CommentsModel.find( { 'product_id' :  req.params.id }).exec()
//         };
//     };
//     getData().then( function(result){
//         res.render('admin/productsDetail', { product: result.product , comments : result.comments });
//     });
    
// });

//상세 페이지 route
//댓글을 첫페이지 로딩시 리스트에서 불러오도록 적용한다.
router.get('/products/detail/:id' , async(req, res) => {
   try{ 
    var product = await ProductsModel.findOne( { 'id' :  req.params.id }).exec();
    var comments = await CommentsModel.find( { 'product_id' :  req.params.id }).exec();
    
    res.render('admin/productsDetail', { product: product , comments : comments });
   }catch(e){

    res.send(e);
   }
});










//제품 수정 페이지 route
router.get('/products/edit/:id' , csrfProtection, function(req, res){
    //기존에 폼에 value안에 값을 셋팅하기 위해 만든다.
    ProductsModel.findOne({ id : req.params.id } , function(err, product){
        res.render('admin/form', { product : product, csrfToken : req.csrfToken() });
    });
});

//제품 수정페이지 수정
//thumbnail 필드 저장한다.
router.post('/products/edit/:id', upload.single('thumbnail'), csrfProtection, function(req, res){

    ProductsModel.findOne( {id: req.params.id}, function(err, product){

        // &&products.thumbnail 없으면 이미지 안 올린 상태에서 수정으로 이미지 올리면 서버 다운된다.
        if(req.file && product.thumbnail){  //요청중에 파일이 존재 할시 이전이미지 지운다. 동기 방식이다.
            fs.unlinkSync( uploadDir + '/' + product.thumbnail );
        }

        //넣을 변수 값을 셋팅한다
        var query = {
            name : req.body.name,
            thumbnail : (req.file)? req.file.filename : product.thumbnail,
            price : req.body.price,
            description : req.body.description,
        };
    
        //update의 첫번째 인자는 조건, 두번째 인자는 바뀔 값들
        ProductsModel.update({ id : req.params.id }, { $set : query }, function(err){
            res.redirect('/admin/products/detail/' + req.params.id ); //수정후 본래보던 상세페이지로 이동
        });
    });
});

//제품 삭제 페이지 route
router.get('/products/delete/:id', function(req, res){
    ProductsModel.remove({ id : req.params.id }, function(err){
        res.redirect('/admin/products');
    });
});


//제품 댓글 작성 post 라우팅
router.post('/products/ajax_comment/insert', function(req, res){
    
    var comment = new CommentsModel({
        content : req.body.content,
        product_id : parseInt(req.body.product_id)
    });

    comment.save(function(err, comment){
    res.json({
        id : comment.id,
        content : comment.content,
        message : "success"
        });
    });
});

//댓글 삭제 구현
router.post('/products/ajax_comment/delete', function(req, res){
    CommentsModel.remove({ id : req.body.comment_id } , function(err){
        res.json({ message : "success" });
    });
});


//써머노트
router.post('/products/ajax_summernote', adminRequired, upload.single('thumbnail'), function(req,res){
    res.send( '/uploads/' + req.file.filename);
});


router.get('/order', function(req,res){
    CheckoutModel.find( function(err, orderList){ //첫번째 인자는 err, 두번째는 받을 변수명
        res.render( 'admin/orderList' , 
            { orderList : orderList }
        );
    });
});


router.get('/order/edit/:id', function(req,res){
    CheckoutModel.findOne( { id : req.params.id } , function(err, order){
        res.render( 'admin/orderForm' , 
            { order : order }
        );
    });
});

//통계용
router.get('/statistics', adminRequired, function(req,res){
    CheckoutModel.find( function(err, orderList){ 
 
        var barData = [];   // 넘겨줄 막대그래프 데이터 초기값 선언
        var pieData = [];   // 원차트에 넣어줄 데이터 삽입
        orderList.forEach(function(order){
            // 08-10 형식으로 날짜를 받아온다
            var date = new Date(order.created_at);
            var monthDay = (date.getMonth()+1) + '-' + date.getDate();
            
            // 날짜에 해당하는 키값으로 조회
            if(monthDay in barData){
                barData[monthDay]++; //있으면 더한다
            }else{
                barData[monthDay] = 1; //없으면 초기값 1넣어준다.
            }
 
            // 결재 상태를 검색해서 조회
            if(order.status in pieData){
                pieData[order.status]++; //있으면 더한다
            }else{
                pieData[order.status] = 1; //없으면 결재상태+1
            }
 
        });
 
        res.render('admin/statistics' , { barData : barData , pieData:pieData });
    });
});

router.post('/order/edit/:id', adminRequired, function(req,res){
    var query = {
        status : req.body.status,
        song_jang : req.body.song_jang
    };
 
    CheckoutModel.update({ id : req.params.id }, { $set : query }, function(err){
        res.redirect('/admin/order');
    });
});

module.exports = router;

