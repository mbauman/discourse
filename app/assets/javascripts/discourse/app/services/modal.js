import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { getOwner } from "@ember/application";
import I18n from "I18n";
import { dasherize } from "@ember/string";
import { action } from "@ember/object";

export default class ModalService extends Service {
  @service appEvents;

  @tracked name;
  @tracked opts = {};
  @tracked selectedPanel;

  get controllerName() {
    if (this.name) {
      return this.opts.admin ? `modals/${this.name}` : this.name;
    }
  }

  get controller() {
    return (
      this.controllerName &&
      getOwner(this).lookup(`controller:${this.controllerName}`)
    );
  }

  get title() {
    if (this.opts.titleTranslated) {
      return this.opts.titleTranslated;
    } else if (this.opts.title) {
      return I18n.t(this.opts.title);
    } else {
      return null;
    }
  }

  set title(value) {
    this.opts = { ...this.opts, titleTranslated: value };
  }

  get modalClass() {
    if (this.name) {
      return (
        this.opts.modalClass || `${dasherize(this.name).toLowerCase()}-modal`
      );
    }
  }

  set modalClass(value) {
    this.opts = { ...this.opts, modalClass: value };
  }

  @action
  onSelectPanel(panel) {
    const handler = this.controller?.actions?.onSelectPanel;
    if (handler) {
      handler.apply(this.controller, [panel]);
    }
  }

  show(name, opts = {}) {
    this.name = name;
    this.opts = opts;

    let controller = this.controller;
    const templateName = opts.templateName || dasherize(name);

    const renderArgs = { into: "application", outlet: "modalBody" };
    if (controller) {
      renderArgs.controller = this.controllerName;
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
    this.#applicationRoute.render(fullName, renderArgs);

    if (opts.panels) {
      this.selectedPanel = opts.panels[0];
    } else {
      this.selectedPanel = null;
    }

    controller.setProperties({
      modal: this,
      model: opts.model,
      flashMessage: null,
    });

    if (controller.onShow) {
      controller.onShow();
    }

    return controller;
  }

  close(initiatedBy) {
    const controller = this.controller;

    if (controller?.beforeClose) {
      if (controller.beforeClose() === false) {
        // controller cancelled close
        return;
      }
    }

    this.#applicationRoute.render("hide-modal", {
      into: "application",
      outlet: "modalBody",
    });
    $(".d-modal.fixed-modal").modal("hide").addClass("hidden");

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

    this.name = this.selectedPanel = null;
    this.opts = {};
  }

  hide() {
    $(".d-modal.fixed-modal").modal("hide");
  }

  reopen() {
    $(".d-modal.fixed-modal").modal("show");
  }

  get #applicationRoute() {
    return getOwner(this).lookup("route:application");
  }
}
