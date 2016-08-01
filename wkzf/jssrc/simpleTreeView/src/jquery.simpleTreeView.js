/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
1. 插件名称：SimpleTreeView
2. 插件描述：树形下拉菜单选择插件
3. 版本：1.0
4. 原理：
5. 使用范例：  
    
6. 未尽事宜：
7. 作者：yuxiaochen@lifang.com
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
;
(function($, window, document, undefined) {

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义相关插件参数
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    var pluginName = 'simpleTreeView',
        defaults = {
            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            获取渲染tree数据的异步请求地址
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            apiUrl: '',
            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            请求的数据类型
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            dataType: "jsonp",

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            设置ajax请求的timeout 时间
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            timeout: 3000,

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            异步请求报文
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            data: null,

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            是否显示搜索框
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            showSearch: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            支持多选的前提下
            改参数表示是否支持向上递归关联
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            enableUpCascade: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            支持多选的前提下
            改参数表示是否支持向下递归关联
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            enableDownCascade: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            树渲染完成后，执行的回调方法 
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            successCallback: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            ajax接口请求出错时候的回调方法 
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            errorCallback: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            ajax当接口返回结果码不为200时候，调用的接口方法 
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            exceptionCallback: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
             bootstrap-treeview 参数配置
             --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            "bootstrapTreeParams": {
                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                设置继承树默认展开的级别,默认为2级
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                "levels": 2,
                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                是否可以同时选择多个节点
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                multiSelect: true,
                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                设置处于checked状态的复选框图标。
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                checkedIcon: "glyphicon glyphicon-stop",

                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                是否在节点上显示边框
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                showBorder: false
            }
        };

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    * ***************************************
    *
    *   构造函数与私有函数定义
    *
    *****************************************
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义treeNode Array containes
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    Array.prototype.containsNode = function(node) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].nodeId === node.nodeId) {
                return true;
            }
        }
        return false;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义treeNode Array 排序方法
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    Array.prototype.sortNode = function() {
        var tmpNode;

        var tmpArr = this;

        for (var i = 0; i < tmpArr.length; i++) {
            for (var j = 0; j < tmpArr.length - i - 1; j++) {
                if (tmpArr[j].nodeId > tmpArr[j + 1].nodeId) {
                    tmpNode = tmpArr[j];
                    tmpArr[j] = tmpArr[j + 1];
                    tmpArr[j + 1] = tmpNode;
                }
            }
        }

        return tmpArr;
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    将flat Data format 转化为嵌套结构的数据
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    function flatToHierarchy(items) {
        //replace content name to text 
        var str = window.JSON.stringify(items);
        str = str.replace(/name/g, 'text');
        items = $.parseJSON(str);

        return items.reduce(insert, {
            res: [],
            map: {}
        }).res;

        function insert(obj, item) {
            var parent = item.pid;
            var map = obj.map;
            map[item.id] = item;

            if (item.open) {
                item.state = {
                    expanded: true
                };
            }

            if (parent === null || parent === 0) {
                obj.res.push(item);
            } else {
                var parentItem = map[parent];

                if (parentItem) {
                    if (parentItem.hasOwnProperty("nodes"))
                        parentItem.nodes.push(item);
                    else parentItem.nodes = [item];
                } else {
                    obj.res.push(item);
                }
            }

            return obj;
        }
    }

    //获取当前节点的所有父节点
    function getParentNodes($tree, node, parentNodes) {
        var pNode = $tree.treeview('getParent', node);
        if (pNode != undefined && pNode.id) {
            parentNodes.push(pNode);

            getParentNodes($tree, pNode, parentNodes);
        } else {
            return parentNodes;
        }
    }

    function getSelectedNode($tree, nodeArr) {
        var tmpNode;
        var pNodesArr, pCheckedArr;
        var toShowNodeArr = new Array();

        //如果选中的节点包括根节点，则直接返回根节点
        if (nodeArr.length == 1 && nodeArr[0].nodeId == 0) {
            toShowNodeArr.push(nodeArr[0]);
        } else {
            for (var i = 0; i < nodeArr.length; i++) {
                tmpNode = nodeArr[i];
                pNodesArr = new Array();
                pCheckedArr = new Array();
                getParentNodes($tree, tmpNode, pNodesArr);

                //判断父节点中是否存在选中的节点
                for (var j = 0; j < pNodesArr.length; j++) {
                    if (pNodesArr[j].state.checked) {
                        pCheckedArr.push(pNodesArr[j]);
                    }
                }

                //如果存在父节点被选中
                if (pCheckedArr.length > 0) {
                    tmpNode = pCheckedArr.sortNode()[0];
                    if (!toShowNodeArr.containsNode(tmpNode)) {
                        toShowNodeArr.push(tmpNode);
                    }
                } else {
                    if (!toShowNodeArr.containsNode(tmpNode)) {
                        toShowNodeArr.push(tmpNode);
                    }
                }
            }
        }

        //console.log(toShowNodeArr);
        return toShowNodeArr;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    构造函数定义
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    function SimpleTreeView(element, options) {
        this.element = $(element);
        this.defaults = defaults;
        this.name = pluginName;

        this.init(options);

        return {
            settings: this.settings,

            init: $.proxy(this.init, this),

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            获取所有的选中项或选择项
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            getChecked: $.proxy(this.getChecked, this),

            getRealChecked: $.proxy(this.getRealChecked, this)
        };
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    入口方法
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.init = function(options) {
        if (this.settings) {
            this.settings = $.extend({}, this.settings, options);
        } else {
            this.settings = $.extend(true, this.defaults, options);
        }

        this.tree = $(this.template.tree);
        this.searchInput = $(this.template.searchInput);

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        reset element state
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.destroy();

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        订阅事件
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.subscribeEvents();

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        设置或请求渲染树的数据
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.setInitialStates();
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    重置控件相关设置
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.destroy = function() {
        // Switch off events
        this.element.off('click');
        $('html').off('click');
        this.searchInput.off('keyup');
        this.element.empty();


        // Reset this.initialized flag
        this.initialized = false;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    订阅事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.subscribeEvents = function() {

        this.unsubscribeEvents();

        //节点勾选事件
        if (typeof(this.settings.onNodeChecked) === 'function') {
            this.$element.on('nodeChecked', this.settings.onNodeChecked);
        }

        //节点勾选去除事件
        if (typeof(this.settings.onNodeUnchecked) === 'function') {
            this.$element.on('nodeUnchecked', this.settings.onNodeUnchecked);
        }


        //去掉所有的勾选节点的事件
        if (typeof(this.settings.onNodesCleared) === 'function') {
            this.element.on('nodesCleared', this.settings.onNodesCleared);
        }

        //节点选中
        if (typeof(this.settings.onNodeUnselected) === 'function') {
            this.element.on('nodeUnselected', this.settings.onNodeUnselected);
        }

        //节点去除选中事件
        if (typeof(this.settings.onNodeSelected) === 'function') {
            this.element.on('nodeSelected', this.settings.onNodeSelected);
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    取消所有订阅事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.unsubscribeEvents = function() {
        this.element.off('nodeChecked');
        this.element.off('nodeUnchecked');
        this.element.off('nodeSelected');
        this.element.off('nodeUnselected');
        this.element.off('nodesCleared');
    };


    SimpleTreeView.prototype.setInitialStates = function() {
        var _ = this;

        if (_.element.attr('data-tree')) {
            _.treeData = $.parseJSON(_.element.attr('data-tree'));
            _.buildTreeSelect();

        } else {
            try {
                $.ajax({
                    url: _.settings.apiUrl,
                    type: 'GET',
                    timeout: _.settings.timeout,
                    dataType: _.settings.dataType,
                    data: _.settings.data,
                    success: function(resp) {
                        if (resp && resp.status == '1') {
                            if (resp.data) {
                                _.initialized = true;
                                if (typeof resp.data === "string") {
                                    _.treeData = $.parseJSON(resp.data);
                                } else {
                                    _.treeData = resp.data;
                                }

                                _.buildTreeSelect();

                                if (_.settings.successCallback) {
                                    successCallback();
                                }
                            }
                        } else {
                            if (_.settings.exceptionCallback) {
                                _.settings.exceptionCallback();
                            }
                        }
                    },
                    error: function(e) {
                        if (_.settings.errorCallback) {
                            _.settings.errorCallback();
                        }
                    }
                })
            } catch (e) {
                logError(e);
                if (_.settings.errorCallback) {
                    _.settings.errorCallback();
                }
            }
        }

    }

    SimpleTreeView.prototype.buildTreeSelect = function() {

        if (this.settings.showSearch) {
            this.element.append(this.searchInput);
        }

        this.element.append(this.tree);

        this.setTree();
    }

    SimpleTreeView.prototype.setTree = function() {
        var tConfig = this.settings.bootstrapTreeParams;

        tConfig.data = this.treeData;
        tConfig.showCheckbox = this.settings.bootstrapTreeParams.multiSelect;
        tConfig.highlightSelected = !this.settings.bootstrapTreeParams.multiSelect;
        tConfig.onhoverColor = this.settings.bootstrapTreeParams.multiSelect ? "" : "#F5F5F5";
        tConfig.enableUpCascade = this.settings.enableUpCascade;
        tConfig.enableDownCascade = this.settings.enableDownCascade;

        this.tree.treeview(tConfig);

        this.bindTreeEvents();
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    给tree 绑定事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.bindTreeEvents = function() {
        var _ = this;

        //搜索框绑定相关事件
        _.searchInput.keyup(function(event) {
            var _this = $(this);

            var sNodes = _.searchNodes($.trim(_this.val()));

            if (sNodes && sNodes.length > 0) {
                //scroll to first checked node postion
                var $firstNode = _.tree.find('li[data-nodeid=' + sNodes[0].nodeId + ']');
                if ($firstNode.length > 0) {
                    _.tree.scrollTop($firstNode.position().top - 60);
                } else {
                    _.tree.scrollTop(0);
                }
            }

        });

        if (_.settings.bootstrapTreeParams.multiSelect) {
            _.tree.on('nodeChecked nodeUnchecked', function(event, node) {});

        } else {
            _.tree.on('nodeSelected', function(event, node) {});
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置Tree 节点的状态
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.setNodeState = function(node, state, options) {
        if (this.settings.bootstrapTreeParams.multiSelect) {
            if (state) {
                this.tree.treeview('checkNode', [node, {
                    silent: false
                }]);
            } else {
                this.tree.treeview('uncheckNode', [node, {
                    silent: false
                }]);
            }

        } else {
            this.tree.treeview('selectNode', [node, {
                silent: false
            }]);
        }
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    搜索节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.searchNodes = function(sText) {
        var options = {
            ignoreCase: true,
            exactMatch: false,
            revealResults: true
        };

        var sResults = this.tree.treeview('search', [sText, options]);

        return sResults;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    获取当前所有选中节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.getChecked = function() {
        var _ = this;
        var checkedNodes = [];


        if (_.settings.bootstrapTreeParams.multiSelect) {
            checkedNodes = _.tree.treeview('getChecked');
            if (_.settings.enableUpCascade) {
                checkedNodes = getSelectedNode(_.tree, checkedNodes)
            }
        } else {
            checkedNodes = _.tree.treeview('getSelected');
        }

        return checkedNodes;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    获取当前选中节点，不包含disabled节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.getRealChecked = function() {        
        var _ = this;        
        var checkedNodes = _.getChecked();        
        var nodes = [];

                
        for (var i = 0; i < checkedNodes.length; i++) {            
            if (!checkedNodes[i].state.disabled) {                
                nodes.push(checkedNodes[i]);            
            }        
        }

        return nodes;    
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据ID属性获取tree Node
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.getNodeById = function(id) {
        var _ = this;
        var tmpNode;
        var nodes = _.tree.treeview('getAllNodes');
        if (nodes && nodes.length > 0) {
            for (var i = nodes.length - 1; i >= 0; i--) {
                tmpNode = nodes[i];
                if (tmpNode.id == id) {
                    break;
                }
            }
        }

        return tmpNode;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    滑动到第一个node的位置
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.goToFirstNodePosition = function(nodeId) {
        var _ = this;
        var $firstLi, preNodes, liHeight;

        var node = _.getNodeById(nodeId);

        if (!node) {
            return;
        }

        $firstLi = _.tree.find('li[data-nodeid=' + node.nodeId + ']');

        if ($firstLi.length > 0) {
            preNodes = $firstLi.prevAll();
            liHeight = $firstLi.height() + parseInt($firstLi.css('padding-top').replace('px', '')) + parseInt($firstLi.css('padding-bottom').replace('px', ''));
            _.tree.scrollTop(liHeight * preNodes.length - 60);
        } else {
            _.tree.scrollTop(0);
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    相关模板定义
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.template = {
        searchInput: '<input class="treeview-search-input form-control" placeholder="请搜索..."></input>',
        tree: '<div class="treeviewSelect-tree"></div>'
    }

    var logError = function(message) {
        if (window.console) {
            window.console.error(message);
        }
    };

    $.fn[pluginName] = function(options, args) {
        var result;

        this.each(function() {
            var _this = $.data(this, pluginName);

            if (typeof options === 'string') {
                if (!_this) {
                    logError('Not initialized, can not call method : ' + options);

                } else if (!$.isFunction(_this[options]) || options.charAt(0) === '_') {
                    logError('No such method : ' + options);
                } else {
                    result = _this[options].apply(_this, args);
                }
            } else if (typeof(options) === 'object') {
                if (!_this) {
                    $.data(this, pluginName, new SimpleTreeView(this, $.extend(true, {}, options)));
                } else {
                    _this['init'].call(_this, options);
                }
            }
        });



        return result || this;
    };

})(jQuery, window, document);
