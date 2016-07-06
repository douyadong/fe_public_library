/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
1. 插件名称：simpleTreeView
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
            bootrap-treeview.js 引用路径
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            sourceUrl: '',

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            请求的数据类型
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            dataType: "jsonp",

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            获取渲染tree数据的异步请求地址
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            apiUrl: '',

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            异步请求报文
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            data: null,

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            是否显示搜索框
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            showSearch: false,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            默认值:false 
            表示：当勾选一个子节点时候，所有的父节点需要勾选. 
            以及当去除所有子节点的勾选的时候，父节点去除勾选.
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            stateSynch: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            接口请求出错时候的接口方法 
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onErrorInterface: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            当接口返回结果码不为200时候，调用的接口方法 
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onExceptionInterface: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            勾选掉所有的选中的节点的事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onNodesCleared: undefined,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            去除勾选事件的事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onNodeUnchecked: undefined,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            勾选节点的事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onNodeChecked: undefined,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            选中节点的事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onNodeSelected: undefined,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            去除选中节点的事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onNodeUnselected: undefined,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
             bootstrap-treeview 参数配置
             --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            "bootstrapTreeParams": {
                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                设置处于checked状态的复选框图标。
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                checkedIcon: "glyphicon glyphicon-stop",

                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                设置继承树默认展开的级别,默认为2级
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                levels: 2,

                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                是否可以同时选择多个节点
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                multiSelect: true,

                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                是否在节点上显示边框
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                showBorder: false,

                /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                设置列表树的节点在用户鼠标滑过时的背景颜色。
                --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
                onhoverColor: ""
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
    向上递归遍历节点，并同步节点状态
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    function up($tree, node, eventType) {
        var isBrothersSameState = true;

        $tree.treeview(eventType, [node.nodeId, {
            silent: true
        }]);

        //对于父节点的操作
        var parent = $tree.treeview('getParent', node);

        //get new node 
        var currentNode = $tree.treeview('getNode', node.nodeId);

        if (parent != undefined && parent.id) {
            if (parent['nodes'] != undefined) {
                var childrens = parent['nodes'];
                for (var i = 0; i < childrens.length; i++) {            
                    if (childrens[i].state.checked != currentNode.state.checked) {
                        isBrothersSameState = false;
                        break;
                    }
                }
            }
            if (isBrothersSameState) {
                if (currentNode.state.checked) {
                    up($tree, parent, 'checkNode');
                } else {
                    up($tree, parent, 'uncheckNode');
                }
            } else {
                up($tree, parent, 'uncheckNode');
            }

        } else {
            return;
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    向下递归遍历节点，并同步节点状态
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    function down($tree, node, eventType) {
        if (node['nodes'] != undefined) {
            var children = node['nodes'];
            for (var i = 0; i < children.length; i++) {            
                $tree.treeview(eventType, [children[i].nodeId, {
                    silent: true
                }]);  

                down($tree, children[i], eventType);
            }

        } else {
            return;
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    获取指定节点的所有父节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
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

        console.log(toShowNodeArr);
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
            getChecked: $.proxy(this.getChecked, this),
            getRealChecked: $.proxy(this.getRealChecked, this),
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
        设置Tree
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.setTree();
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

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    请求接口地址
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.setTree = function(data) {
        var _ = this;

        try {
            $.ajax({
                url: _.settings.apiUrl,
                type: 'GET',
                dataType: _.settings.dataType,
                data: _.settings.data,
                success: function(resp) {
                    if (resp && resp.status == '1') {
                        if (resp.data) {
                            require([_.settings.sourceUrl], function() {
                                _.initialized = true;
                                _.renderTree(resp.data);
                                _.addListenersToTree();
                            });
                        }
                    } else {
                        if (_.settings.onExceptionInterface) {
                            _.settings.onExceptionInterface();
                        }
                    }
                },
                error: function() {
                    if (_.settings.onErrorInterface) {
                        _.settings.onErrorInterface();
                    }
                }
            })
        } catch (e) {
            logError(e);
        }
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    渲染tree View 
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.renderTree = function(data) {
        var _ = this;
        var tConfig = _.settings.bootstrapTreeParams;
        tConfig.data = data;
        tConfig.showCheckbox = _.settings.bootstrapTreeParams.multiSelect;
        tConfig.highlightSelected = !_.settings.bootstrapTreeParams.multiSelect;

        if (_.settings.showSearch) {
            _.element.append(_.searchInput);
        }

        _.tree.treeview(tConfig);
        _.element.append(_.tree);
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    给tree 绑定事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.addListenersToTree = function() {
        var _ = this;

        //搜索框绑定相关事件
        _.searchInput.keyup(function(event) {
            var _this = $(this);
            var sNodes = _.searchNodes($.trim(_this.val()));

            if (sNodes && sNodes.length > 0) {
                //scroll to first checked node postion
                var $firstNode = _.tree.find('li[data-nodeid=' + sNodes[0].nodeId + ']');
                if ($firstNode.length > 0) {
                    //console.log($firstNode.position().top);
                    _.element.scrollTop($firstNode.position().top - 60);
                } else {
                    _.element.scrollTop(0);
                }
            }

        });

        if (_.settings.bootstrapTreeParams.multiSelect) {
            _.tree.on('nodeChecked nodeUnchecked', function(event, node) {
                _.setNodeState(event.type, node);
            });

        } else {
            _.tree.on('nodeSelected', function(event, node) {
                _.setNodeState(event.type, node);
            });
        }
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置Tree 节点的状态
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.setNodeState = function(eventType, node) {
        var _ = this;

        //如果支持多选
        if (this.settings.bootstrapTreeParams.multiSelect) {

            if (eventType === 'nodeChecked') {
                if (_.settings.stateSynch) {
                    //找到节点所有父节点
                    var pNodes = new Array();
                    getParentNodes(_.tree, node, pNodes);

                    if (pNodes && pNodes.length) {
                        for (var i = 0; i < pNodes.length; i++) {
                            _.tree.treeview('checkNode', [pNodes[i].nodeId, {
                                silent: true
                            }]);
                        }
                    }

                    //同步所有子节点的状态
                    down(this.tree, node, 'checkNode');

                    //this.element.trigger(eventType, $.extend(true, {}, node));
                } else {
                    up(this.tree, node, 'checkNode');

                    down(this.tree, node, 'checkNode');
                }

            } else {
                if (!_.settings.stateSynch) {
                    up(this.tree, node, 'uncheckNode');
                }

                down(this.tree, node, 'uncheckNode');
            }
        } else {
            this.element.trigger(eventType, $.extend(true, {}, node));
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

        return _.tree.treeview('getChecked');
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    获取当前选中节点，不包含disabled节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.getRealChecked = function() {        
        var _ = this;        
        var checkedNodes = _.tree.treeview('getChecked');        
        var nodes = new Array();

                
        for (var i = 0; i < checkedNodes.length; i++) {            
            if (!checkedNodes[i].state.disabled) {                
                nodes.push(checkedNodes[i]);            
            }        
        }

        return nodes;    
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    相关显示dom元素模板定义
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    SimpleTreeView.prototype.template = {
        tree: '<div class="treeviewSelect-tree"></div>',
        searchInput: '<input class="treeview-search-input" placeholder="请搜索..."></input>',
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
