/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1. 项目名称：悟空找房移动端FE-MVC框架
 2. 页面名称：Controller (每个页面的类都继承于这个控制器基类)
 3. 作者：zhaohuagang@lifang.com
 4. 备注：对api的依赖：jQuery
 -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function Controller() {
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    静态资源域名序列随机化，为什么要定义在上面，因为在后面定义的话前面用这个方法取不到
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.randomDomainSn = function() {
        //var sn = parseInt(Math.random() * 20 + 1, 10).toString() ;
        /*var sn = Math.floor(Math.random()*10 + 1).toString() ;
        if (sn.length < 2) sn = "0" + sn ;
        return sn ;*/
        return '01' ;
    };
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    对环境的定义：
    @dev : 开发环境，对应静态资源域名为：dev01.fe.wkzf - dev10.fe.wkzf
    @test：测试环境，对应静态资源域名为：test01.fe.wkzf - test10.fe.wkzf
    @beta：beta环境，对应静态资源域名为：beta01.fe.wkzf - beta10.fe.wkzf
    @sim：sim环境，对应静态资源域名为：sim01.fe.wkzf - sim10.fe.wkzf.com
    @prod ：生产环境，对应静态资源域名为：cdn01.wkzf.com - cdn10.wkzf.com
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/    
    this.environment = STAGE_ENVIRONENT ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    一些关于cookie参数的配置
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/    
    this.cookieKeyConf = {

    } ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据环境决定static资源域名
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.staticDomain = "//dev" + this.randomDomainSn() + ".fe.wkzf" ;
    if (this.environment === "test") this.staticDomain = "//test." + this.randomDomainSn() + ".wkzf" ;
    else if (this.environment === "sim") this.staticDomain = "sim" + this.randomDomainSn() + ".wkzf" ;
    else if (this.environment === "prod") this.staticDomain = "cdn" + this.randomDomainSn() + ".wkzf.com" ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    工具库路径及应用的控制器路径
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/    
    this.utilStaticPrefix = this.staticDomain + "/fe_public_library/wkzf/js/util" ;
    this.appStaticPrefix = this.staticDomain + "/cloud_fe/js" ;    
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    整个应用Ajax请求的时候的数据类型，是json还是jsonp，无论哪种环境都要用json，因为使用同源策略解决了跨域问题
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.apiDataType = "json" ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    接口的地址，把整个应用的所有接口地址写在这里，方便统一维护    
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.apiPrefix = (this.environment === "dev") ? "//10.0.18.192:8133/bzsm/" : "/" ;   //api接口地址前缀
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    系统各个模块API地址
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.apiUrl = {
        
    } ;    
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    发送Ajax请求的方法：
    @apiUrl：请求的url地址
    @data：请求附带发送的参数数据
    @params：{
        @type：请求的类型，可以是：GET|POST，但是如果apiDataType参数指为jsonp的话，这里设置为POST有没有任何意义，因为jsonp只能是GET        
        @process：code==200的时候的回调接口方法
        @onExceptionInterface：发生错误的时候的回调接口方法
    }    
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.request = function(apiUrl, data, params) {
        var type = (params === null || params.type === null || params.type === undefined) ? "GET" : params.type ;
        var process = (params === null || params.process === null || params.process === undefined) ? null : params.process ;
        var beforeSend = (params === null || params.beforeSend === null || params.beforeSend === undefined) ? null : params.beforeSend ;
        var onExceptionInterface = (params === null || params.onExceptionInterface === null || params.onExceptionInterface === undefined) ? null : params.onExceptionInterface ;
        var options = {
            url : apiUrl ,
            type : type ,
            data : data ,
            beforeSend : function() {
                $.showLoading("正在加载...") ;
            },
            error : function(e) {
                $.hideLoading() ;
                $.alert("调用数据接口失败！请测试您的数据接口！", "警告") ;
            },
            success: function(data) {
                $.hideLoading() ;
                if (data.status.toString() === "1") {
                    if (process) process(data) ; //一切没有问题，就处理数据
                }
                else {
                    if (onExceptionInterface) onExceptionInterface(data.status, data.message) ;
                }
            } ,
            timeout : 10000
        } ;
        try {
            $.ajax(options) ;
        } catch (e) {
            $.alert("错误名称：" + e.name + "\n错误描述：" + e.message, "警告") ;
        }
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        整个try-catch块结束
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    } ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    图片延迟加载
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.lazyload = function() {
        require([this.utilStaticPrefix + "/jquery.lazyload.min.js"], function() {
            $(".lazy").lazyload() ;
        });
    } ;    
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    页面加载的时候执行的公共逻辑
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.onload = function() {
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        图片延迟加载
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.lazyload() ;        
    } ;
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    整个基类逻辑结束
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    this.onload() ;
} ;
