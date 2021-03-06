define([
    'jquery',
    'underscore',
    'underscore_string',
    'backbone',
    'text!../Templates/folder_browser.html',
    './FileUpload',
    './FolderCreation',
    './FolderProperties',
    'ContextMenuView'
], function ($, _, _s, Backbone, FolderBrowserTemplate, FileUploadView, FolderCreationView, FolderPropertiesView, ContextMenuView) {
    var FolderBrowser = Backbone.View.extend({
        tagName: "div",
        className: "k_fs_folder_browser",
        initialize: function () {

        },
        init: function (app) {
            var base = this;
            base.app = app;
            base.files_list = new SmartBlocks.Blocks.Filesharing.Collections.Files();
            base.parent_folder = 0;
            base.current_folder = 0;
            SmartBlocks.events.on("ws_notification", function (message) {
                if (message.app == "k_fs") {
                    if (message.status == "changed_directory") {
                        if (message.folder_id == base.folder.get("id")) {
                            console.log(message);
                            base.reload();
                        }
                    }
                }

            });

            base.fetchAll(0);
        },
        initializeEvents: function () {
            var base = this;
            base.$el.attr("oncontextmenu", "return false;");
            base.$el.find(".k_fs_thumbnail").disableSelection();

            base.$el.find(".k_fs_folder_tb").click(function () {
                var elt = $(this);
                base.fetchAll(elt.attr("data-file_id"));
            });

            base.$el.find(".k_fs_folder_tb").mousedown(function (e) {
                var elt = $(this);
                switch (e.which) {
                    case 3:
                        var context_menu = new ContextMenuView();
                        context_menu.addButton("Open", function () {
                            base.fetchAll(elt.attr("data-folder_id"));
                        }, '/images/icons/folder_go.png');
                        context_menu.addButton("Delete", function () {
                            if (confirm("Are you sure you want to delete that folder and all the files in it ?")) {
                                var folder = new SmartBlocks.Blocks.Filesharing.Models.File({id: elt.attr("data-file_id")});
                                folder.destroy({
                                    success: function () {
                                        base.fetchAll(base.current_folder);
                                    }
                                });
                            }
                        }, '/images/icons/cross.png');
                        context_menu.addButton("Properties", function () {
                            var folder_properties = new FolderPropertiesView({ model: base.files_list.get(elt.attr('data-file_id')) });
                            folder_properties.init(base.SmartBlocks, base);
                            $("body").prepend(folder_properties.$el);
                        }, '/images/icons/folder_wrench.png');
                        context_menu.show(e);
                        break;
                    default:
                        break;
                }
            });

            base.$el.find(".k_fs_file_tb").dblclick(function (e) {
                var elt = $(this);
                if (elt.attr("data-file_id") != undefined) {
                    window.location = "/Filesharing/Files/get_file/" + elt.attr("data-file_id");
                    window.focus();
                }
            });

            base.$el.find(".k_fs_file_tb").mousedown(function (e) {
                var elt = $(this);
                switch (e.which) {
                    case 3:
                        var context_menu = new ContextMenuView();
                        context_menu.addButton("Download", function () {
                            if (elt.attr("data-file_id") != undefined) {
//                                window.open(
//                                    "/Files/get_file/" + elt.attr("data-file_id")
//                                );
                                window.location = "/Filesharing/Files/get_file/" + elt.attr("data-file_id");
                                window.focus();
                            }

                        }, '/images/icons/folder_go.png');
                        context_menu.addButton("Delete", function () {
                            if (confirm("Are you sure you want to delete that file ?")) {
                                var file = new SmartBlocks.Blocks.Filesharing.Models.File({ id: elt.attr("data-file_id")});
                                console.log("deleting");
                                file.destroy({
                                    success: function () {
                                        base.fetchAll(base.current_folder);
                                        console.log("deleted");
                                    }
                                });
                            }
                        }, '/images/icons/cross.png');
                        context_menu.show(e);
                        break;
                    default:
                        break;
                }
            });

            $(".k_fs_parent_folder").unbind("click");
            $(".k_fs_parent_folder").click(function () {
                var elt = $(this);
                if (base.folder)
                    base.fetchAll(base.folder.get('parent_folder') !== undefined ? base.folder.get('parent_folder').get("id") : 0);
            });


            SmartBlocks.Blocks.Filesharing.Data.files.on("add", function () {
                base.render();
                alert("stuff");
            });

            SmartBlocks.Blocks.Filesharing.Data.files.on("remove", function () {
                base.render();
                alert("stuff");
            });

        },
        render: function () {
            var base = this;
            var template = _.template(FolderBrowserTemplate, {_s: _s, files: base.files_list.models});

            base.$el.html(template);
            base.initializeEvents();
            if (base.folder)
                $(".k_fs_current_address").html(base.folder.get("address") !== undefined ? base.folder.get("address") : "/");
            else
                $(".k_fs_current_address").html("/");
            base.fetchFiles(null);
        },
        reload: function () {
            var base = this;
            base.fetchAll(base.current_folder);
        },
        refresh: function () {
            var base = this;
            base.fetchAll(base.folder.get("id"));
        },
        fetchAll: function (folder_id, callback) {
            var base = this;
            if (base.$el.is(":visible")) {
                base.fetchFiles(folder_id, function () {
                    if (base.current_folder != folder_id) {
                        base.current_folder = folder_id !== undefined ? folder_id : 0;
                    }
                    base.folder = SmartBlocks.Blocks.Filesharing.Data.files.get(folder_id);
                    base.render();
                });
            }
        },
        fetchFiles: function (folder_id, callback) {
            var base = this;
            SmartBlocks.Blocks.Filesharing.Data.files.fetch({
                success: function () {
                    base.files_list = new SmartBlocks.Blocks.Filesharing.Collections.Files(SmartBlocks.Blocks.Filesharing.Data.files.filter(function (file) {
                        return file.get("parent_folder").get("id") == folder_id;
                    }));
                    console.log(folder_id);
                    if (callback) {
                        callback();
                    }
                }
            });
        },
        createFolder: function () {
            var base = this;

            var fc_view = new FolderCreationView();
            fc_view.init(base.SmartBlocks, base);
            $("body").prepend(fc_view.$el);
        },

        uploadFile: function () {
            var base = this;
            var file_upload_view = new FileUploadView();
            file_upload_view.init(base.SmartBlocks, base);
            $("body").prepend(file_upload_view.$el);
        }

    });

    return FolderBrowser;
});