
//글 작성시 또는 글 수정시 login이 안되있으면 login page로 이동
module.exports = function(req, res, next) {
    if (!req.isAuthenticated()){ 
        res.redirect('/accounts/login');
    }else{
        return next();
    }
};