import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { getOwner } from "@ember/application";
import I18n from "I18n";
import { dasherize } from "@ember/string";
import { action } from "@ember/object";

export default class ModalService extends Service {
  @service appEvents;

  @tracked controllerName;
  @tracked name;
  @tracked opts;
  @tracked selectedPanel;

  get visible() {
    return !!this.controllerName;
  }

  get activeController() {
    return (
      this.controllerName &&
      getOwner(this).lookup(`controller:${this.controllerName}`)
    );
  }

  get title() {
    if (this.opts.title) {
      return I18n.t(this.opts.title);
    } else if (this.opts.titleTranslated) {
      return this.opts.titleTranslated;
    } else {
      return null;
    }
  }

  get modalClass() {
    return (
      this.opts.modalClass || `${dasherize(this.name).toLowerCase()}-modal`
    );
  }

  set modalClass(value) {
    this.opts.modalClass = value;
    this.opts = this.opts; // Notify users of tracked property
  }

  @action
  onSelectPanel() {
    const handler = this.activeController?.actions?.onSelectPanel;
    if (handler) {
      handler.apply(this.activeController);
    }
  }

  show(name, opts = {}) {
    const controllerName = (this.controllerName = opts.admin
      ? `modals/${name}`
      : name);
    this.modalName = controllerName;

    this.name = name;
    this.opts = opts;

    let controller = getOwner(this).lookup("controller:" + controllerName);
    const templateName = opts.templateName || dasherize(name);

    const renderArgs = { into: "application", outlet: "modalBody" };
    if (controller) {
      renderArgs.controller = controllerName;
    } else {
      // use a basic controller
      renderArgs.controller = "basic-modal-body";
      controller = getOwner(this).lookup(`controller:${renderArgs.controller}`);
    }

    if (opts.addModalBodyView) {
      renderArgs.view = "modal-body";
    }

    const modalName = `modal/${templateName}`;
    const fullName = opts.admin ? `admin/templates/${modalName}` : modalName;
    const route = getOwner(this).lookup("route:application");
    route.render(fullName, renderArgs);

    if (opts.panels) {
      this.selectedPanel = opts.panel[0];
    } else {
      this.selectedPanel = null;
    }

    controller.set("modal", this);

    const model = opts.model;
    if (model) {
      controller.set("model", model);
    }
    if (controller.onShow) {
      controller.onShow();
    }
    controller.set("flashMessage", null);

    return controller;
  }

  close(initiatedBy) {
    const controller = this.activeController;

    if (controller?.beforeClose) {
      if (controller.beforeClose() === false) {
        // controller cancelled close
        return;
      }
    }

    if (controller) {
      this.appEvents.trigger("modal:closed", {
        name: this.controllerName,
        controller,
      });

      if (controller.onClose) {
        controller.onClose({
          initiatedByCloseButton: initiatedBy === "initiatedByCloseButton",
          initiatedByClickOut: initiatedBy === "initiatedByClickOut",
          initiatedByESC: initiatedBy === "initiatedByESC",
        });
      }
    }

    this.controllerName = null;
  }

  hide() {
    $(".d-modal.fixed-modal").modal("hide");
  }

  reopen() {
    $(".d-modal.fixed-modal").modal("show");
  }
}
