/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
1. 插件名称：treeViewSelect
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
    var pluginName = 'treeViewSelect',
        defaults = {
            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            获取渲染tree数据的异步请求地址
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            apiUrl: '',

            /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
            请求方法，Get OR POST
            -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            type: 'GET',

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
            placeholder 文本
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            placeholder: '请选择...',

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            defaultVals 默认值s
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            defaultVals: null,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            enableUpCascade 设置勾选节点是否影响上级节点,即向上递归
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            enableUpCascade: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            enableUpCascade 设置勾选节点是否影响上级节点,即向上递归
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            enableDownCascade: true,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            是否显示级联的文本，目前只支持单选的前提下。
            默认为false ,表示 点击长宁区节点，选中项文本为 [长宁区]
            为true时，选中项文本为[上海市-长宁区]
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            cascadeText: false,

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            cascadeText 为true 的时候，选中项文本的分隔符
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            cascadeTextSeparator: '-',

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
            勾选或者选中，选中项生成好了，回调事件
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            onCompleted: undefined,

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
    function TreeViewSelect(element, options) {
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

            /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            设置默认值
            --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
            setDefaults: $.proxy(this.setDefaults, this),
        };
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    入口方法
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.init = function(options) {
        if (this.settings) {
            this.settings = $.extend({}, this.settings, options);
        } else {
            this.settings = $.extend(true, this.defaults, options);
        }

        this.treeContainer = $(this.template.treeContainer);
        this.tree = $(this.template.tree);
        this.searchInput = $(this.template.searchInput);
        this.placeholder = $(this.template.placeholder).html(this.settings.placeholder);
        this.defaultVals = this.element.attr("data-id") ? this.element.attr("data-id").split(',') : [];

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
    TreeViewSelect.prototype.destroy = function() {
        // Switch off events
        this.element.off('click');
        $('html').off('click');
        this.searchInput.off('keyup');

        this.element.empty();
        this.treeContainer.empty();

        // Reset this.initialized flag
        this.initialized = false;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    订阅事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.subscribeEvents = function() {

        this.unsubscribeEvents();

        if (typeof(this.settings.onCompleted) === 'function') {
            this.element.on('completed', this.settings.onCompleted);
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    取消所有订阅事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.unsubscribeEvents = function() {
        this.element.off('nodeChecked');
        this.element.off('nodeUnchecked');
        this.element.off('nodeSelected');
        this.element.off('nodeUnselected');
        this.element.off('nodesCleared');
        this.element.off('completed');
    };


    TreeViewSelect.prototype.setInitialStates = function() {
        var _ = this;

        if (_.element.attr('data-tree')) {
            _.treeData = $.parseJSON(_.element.attr('data-tree'));
            _.buildTreeSelect();
        } else {
            try {
                $.ajax({
                    url: _.settings.apiUrl,
                    type: _.settings.type,
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

    TreeViewSelect.prototype.buildTreeSelect = function() {
        var treeContainerId;

        //选项项容器部分
        this.element.addClass('treeviewSelect-selection');
        this.element.append($(this.placeholder));
        this.element.append($(this.template.listGroup));
        this.element.append($(this.template.listOpGroup));

        //tree
        treeContainerId = 'treeContainerId_' + parseInt($('.treeviewSelect-container').length + 1);
        this.treeContainer.attr('id', treeContainerId);
        if (this.settings.showSearch) {
            this.treeContainer.append(this.searchInput);
        }
        this.treeContainer.append(this.tree);
        this.element.parent().append(this.treeContainer);

        this.setTree();

        this.setSelectList();

        this.renderItems(true);
    }

    TreeViewSelect.prototype.setTree = function() {
        var tConfig = this.settings.bootstrapTreeParams;

        tConfig.data = flatToHierarchy(this.treeData);
        tConfig.showCheckbox = this.settings.bootstrapTreeParams.multiSelect;
        tConfig.highlightSelected = !this.settings.bootstrapTreeParams.multiSelect;
        tConfig.onhoverColor = this.settings.bootstrapTreeParams.multiSelect ? "" : "#F5F5F5";
        tConfig.enableUpCascade = this.settings.enableUpCascade;
        tConfig.enableDownCascade = this.settings.enableDownCascade;

        this.tree.treeview(tConfig);

        this.bindTreeEvents();

        this.setTreePosition();
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    给tree 绑定事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.bindTreeEvents = function() {
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
            _.tree.on('nodeChecked nodeUnchecked', function(event, node) {
                _.renderItems();
            });

        } else {
            _.tree.on('nodeSelected', function(event, node) {
                _.treeContainer.addClass('hide');
                _.renderItems();
            });
        }
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    初始化已选择列表
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.setSelectList = function() {
        var _ = this;

        //绑定点击事件
        _.element.on('click', function() {
            var firstNodeId, $firstNode;
            //先隐藏掉其他treeViewSelect
            $('.treeviewSelect-container').each(function(index, el) {
                if ($(el).attr('id') != _.treeContainer.attr('id')) {
                    $(el).addClass('hide');
                }
            });

            //设置tree 点击是否显示
            if (_.treeContainer.hasClass('hide') && _.initialized) {

                //显示tree
                _.treeContainer.removeClass('hide');

                //重置搜索框
                _.searchInput.val('');
                _.tree.treeview('clearSearch');


                //循环遍历所有选中项，勾选对应节点，并展开
                _.element.find('.treeviewselect-item').each(function(index, el) {
                    var nodeId = $(el).attr('nodeid'),
                        node;

                    if (nodeId) {
                        node = _.getNodeById(nodeId);
                        _.setNodeState(node, true);

                        //展开节点
                        if (node['nodes']) { //如存在子节点
                            _.tree.treeview('expandNode', [node, {
                                levels: 1,
                                silent: true
                            }]);

                        } else { //不存在子节点，就展开对应的父节点
                            var pNode = _.tree.treeview('getParent', node);
                            if (pNode.nodeId) {
                                _.tree.treeview('expandNode', [pNode, {
                                    levels: 1,
                                    silent: true
                                }]);
                            }
                        }

                        //记录第一个节点
                        if (index === 0) {
                            firstNodeId = nodeId;
                        }
                    }
                });

                //滑动到第一个node的位置
                _.goToFirstNodePosition(firstNodeId);

            } else {
                _.treeContainer.addClass('hide');
            }

            return false;
        });

        //outside click hide the treecontainer
        $('html').on('click', function(eventObject) {
            var $el = $(eventObject.target);

            if (!$el.hasClass('list-group-item') && !$el.hasClass('check-icon') && !$el.hasClass('treeview-search-input') && !$el.hasClass('expand-icon') && !$el.hasClass('treeviewSelect-container')) {
                $('.treeviewSelect-container').addClass('hide');
            }
        });
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    渲染选择项
    params:
    @isDefault:是否设置默认选项
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.renderItems = function(isDefault) {
        var _ = this;
        var checkedNodes, listNodes, totalWidth, pNodesArr, nodeIds, tmpNode;
        var $itemLisGroup, $clearItem, $selectedItem, $ellipsisItem;
        var hiddenNodeStrs = '';

        if (isDefault) {
            if (this.defaultVals && this.defaultVals.length > 0) {
                if (this.defaultVals && this.defaultVals.length > 0) {
                    for (var i = 0; i < this.defaultVals.length; i++) {
                        tmpNode = _.getNodeById(this.defaultVals[i]);
                        if (_.settings.bootstrapTreeParams.multiSelect) {
                            _.tree.treeview('checkNode', [tmpNode, {
                                silent: true
                            }]);

                        } else {
                            _.tree.treeview('selectNode', [tmpNode, {
                                silent: true
                            }]);
                        }
                    }
                }
            }
        }

        if (_.settings.bootstrapTreeParams.multiSelect) {
            checkedNodes = _.tree.treeview('getChecked');
            listNodes = checkedNodes;
            if (_.settings.enableUpCascade || _.settings.enableDownCascade) {
                listNodes = getSelectedNode(_.tree, checkedNodes);
            }
        } else {
            listNodes = _.tree.treeview('getSelected');
        }


        $clearItem = $(_.template.clearItem);
        $ellipsisItem = $(_.template.ellipsisItem);
        $itemLisGroup = _.element.find('.treeviewselect-listGroup ul');
        $itemLisGroup.empty();
        _.element.find('.treeviewselect-listOpGroup .treeviewselect-clear').remove();

        if (listNodes && listNodes.length > 0) {
            //隐藏placeholder
            _.placeholder.hide();

            for (var i = 0; i < listNodes.length; i++) {
                totalWidth = 0;
                pNodesArr = [];

                //取出指定节点的父节点的数量，并给节点赋值，父节点的数量就是节点的level 值
                getParentNodes(_.tree, listNodes[i], pNodesArr);
                listNodes[i].level = pNodesArr.length;

                //生成选中项
                $selectedItem = _.genTreeSelectItem(listNodes[i]);

                //如果支持多选但是不支持多行，则超出部分显示省略号
                if (_.settings.bootstrapTreeParams.multiSelect) {
                    $selectedItem.css('visibility', 'hidden');
                    $itemLisGroup.append($selectedItem);

                    if (($itemLisGroup.width() - $itemLisGroup.position().left) > ($('.treeviewselect-listOpGroup').position().left) - 38) {
                        $selectedItem.hide();
                        hiddenNodeStrs += listNodes[i].text + ';';
                    } else {
                        $selectedItem.css('visibility', 'visible');
                    }
                } else {
                    $itemLisGroup.append($selectedItem);
                }
            }

            if (hiddenNodeStrs) {
                $ellipsisItem.css('visibility', 'visible').attr({
                    'data-toggle': 'tooltip',
                    'data-placement': 'top',
                    'title': hiddenNodeStrs
                });
                $itemLisGroup.append($ellipsisItem);
            }
        } else {
            _.placeholder.show();
        }


        //支持多选则添加清空按钮
        if (_.settings.bootstrapTreeParams.multiSelect && listNodes.length) {
            //重置筛选条件按钮绑定事件
            $clearItem.find('.glyphicon-remove').on('click', function() {
                $itemLisGroup.empty();
                _.placeholder.show();
                _.element.find('.treeviewselect-listOpGroup .treeviewselect-clear').remove();

                _.tree.treeview('uncheckAll', {
                    silent: true
                });
            });

            //添加重置筛选条件        
            _.element.find('.treeviewselect-listOpGroup ul').prepend($clearItem);
        }

        $('[data-toggle="tooltip"]').tooltip('destroy');
        $('[data-toggle="tooltip"]').tooltip();

        if (!isDefault) {
            _.element.trigger('completed', [listNodes]);
        }

    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置Tree 节点的状态
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.setNodeState = function(node, state, options) {
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
    生成选中项
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.genTreeSelectItem = function(node) {
        var _ = this;
        var $selectedItem, pNodes = [];

        //判断是否支持多选
        if (_.settings.bootstrapTreeParams.multiSelect) {
            $selectedItem = $(_.template.item);
        } else {
            $selectedItem = $(_.template.singleItem);
        }

        $selectedItem.attr('nodeid', node.id);

        if (_.settings.cascadeText && !_.settings.bootstrapTreeParams.multiSelect) {
            var tText = '';
            getParentNodes(_.tree, node, pNodes);
            if (pNodes) {
                for (var i = pNodes.length - 1; i >= 0; i--) {
                    tText += pNodes[i].text + _.settings.cascadeTextSeparator;
                }

                $selectedItem.find('span').html(tText + node.text);
            } else {
                $selectedItem.find('span').html(node.text);
            }
        } else {
            $selectedItem.find('span').html(node.text);
        }

        if (node.text.length > 3) {
            $selectedItem.attr({
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': node.text
            });
        }

        $selectedItem.find('.glyphicon-remove').on('click', function() {
            var _this = $(this);

            var node = _.getNodeById(_this.parent().attr('nodeid'));

            _.setNodeState(node, false);

            if ($('.treeviewselect-listGroup .selected-item').length === 0) {
                $('.treeviewselect-listOpGroup .treeviewselect-clear').remove();
            }

            _this.parent().remove();

            return false;
        });

        return $selectedItem;
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置treeConainer的位置
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.setTreePosition = function() {
        var _ = this;

        var sOffset = _.element.position();
        var sPaddingTop = _.element.css('padding-top').replace('px', '');
        var sPaddingBottom = _.element.css('padding-bottom').replace('px', '');
        var sPaddingLeft = _.element.css('padding-left').replace('px', '');
        var sPaddingRight = _.element.css('padding-right').replace('px', '');

        var tHeight = 250; //treeView的高度,默认为300px
        var tWidth = _.element.width() + parseInt(sPaddingLeft) + parseInt(sPaddingRight); //treeView的宽度
        var tTop = sOffset.top + _.element.height() + parseInt(sPaddingTop) + parseInt(sPaddingBottom); + 5;
        var tLeft = sOffset.left;

        tHeight = _.treeContainer.find('li.list-group-item').length * 40 * 0.2;
        // tWidth = tWidth < 250 ? 250 : tWidth;
        tHeight = tHeight < 250 ? 250 : tHeight;


        _.treeContainer.css({
            'top': tTop,
            'left': tLeft
        });

        _.tree.css({
            'height': tHeight,
            'width': tWidth
        });

        _.element.css('width', tWidth);
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    搜索节点
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.searchNodes = function(sText) {
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
    TreeViewSelect.prototype.getChecked = function() {
        var _ = this;
        var checkedNodes;

        var idArray = new Array();

        if (!_.settings.bootstrapTreeParams.multiSelect) {
            _.element.find('.treeviewselect-item').each(function(index, el) {
                if (!$(el).hasClass('ellipsis-item')) {
                    idArray.push($(el).attr('nodeid'));
                }
            });
        } else {
            checkedNodes = _.tree.treeview('getChecked');
            if (checkedNodes) {
                for (var i = 0; i < checkedNodes.length; i++) {
                    idArray.push(checkedNodes[i].id);
                }
            }
        }


        return idArray;
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置默认值
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.setDefaults = function(vals) {
        if (!vals || !vals.length) {
            return;
        }
        this.defaultVals = vals;

        this.renderItems(true);
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据ID属性获取tree Node
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    TreeViewSelect.prototype.getNodeById = function(id) {
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
    TreeViewSelect.prototype.goToFirstNodePosition = function(nodeId) {
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
    TreeViewSelect.prototype.template = {
        listGroup: '<li class="treeviewselect-listGroup"><ul></ul></li>',
        listOpGroup: '<li class="treeviewselect-listOpGroup"><ul></ul></li>',
        item: '<li class="treeviewselect-item selected-item"><i class="glyphicon glyphicon-remove"></i><span></span></li>',
        clearItem: '<li class="treeviewselect-clear"><i class="glyphicon glyphicon-remove"></i></li>',
        ellipsisItem: '<li class="treeviewselect-item ellipsis-item">....</li>',
        singleItem: '<li class="treeviewselect-item"><span></span></li>',
        bottomArrowItem: '<li class="treeviewselect-arrow"><i class="glyphicon glyphicon-triangle-bottom"></i></li>',
        inlineInput: '<li><input type="text" class="treeviewSelect-inline-input"></li>',
        treeContainer: '<ul class="treeviewSelect-container hide"></ul>',
        searchInput: '<input class="treeview-search-input" placeholder="请搜索..."></input>',
        tree: '<div class="treeviewSelect-tree"></div>',
        placeholder: '<li class="treeviewselect-placeholder"></li>'
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
                    $.data(this, pluginName, new TreeViewSelect(this, $.extend(true, {}, options)));
                } else {
                    _this['init'].call(_this, options);
                }
            }
        });



        return result || this;
    };

})(jQuery, window, document);
