import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { getOwner } from "@ember/application";
import I18n from "I18n";
import { dasherize } from "@ember/string";
import { action } from "@ember/object";
import LegacyControllerShimModal, {
  connectLegacyController,
  disconnectLegacyController,
} from "discourse/components/modal/legacy-controller-shim";

export default class ModalService extends Service {
  @service appEvents;

  @tracked name;
  @tracked opts = {};
  @tracked selectedPanel;
  @tracked modalBodyComponent;

  @tracked titleOverride;
  @tracked modalClassOverride;

  get title() {
    if (this.titleOverride) {
      return this.titleOverride;
    } else if (this.opts.titleTranslated) {
      return this.opts.titleTranslated;
    } else if (this.opts.title) {
      return I18n.t(this.opts.title);
    } else {
      return null;
    }
  }

  set title(value) {
    this.titleOverride = value;
  }

  get modalClass() {
    if (!this.#isRendered) {
      return null;
    }

    if (this.modalClassOverride) {
      return this.modalClassOverride;
    } else {
      return (
        this.opts.modalClass || `${dasherize(this.name).toLowerCase()}-modal`
      );
    }
  }

  set modalClass(value) {
    this.modalClassOverride = value;
  }

  @action
  onSelectPanel(panel) {
    const handler = this.controller?.actions?.onSelectPanel;
    if (handler) {
      handler.apply(this.controller, [panel]);
    }
  }

  show(modal, opts = {}) {
    this.opts = opts;

    if (opts.panels) {
      this.selectedPanel = opts.panels[0];
    } else {
      this.selectedPanel = null;
    }

    if (typeof modal === "string") {
      this.modalBodyComponent = LegacyControllerShimModal;
      this.name = modal;

      return connectLegacyController(modal, opts, getOwner(this));
    } else {
      throw "todo - implement component support";
    }
  }

  close(initiatedBy) {
    if (!this.#isRendered) {
      return;
    }

    if (this.modalBodyComponent === LegacyControllerShimModal) {
      disconnectLegacyController(initiatedBy, this.name, getOwner(this));
    } else {
      throw "todo - implement component support";
    }

    this.name =
      this.selectedPanel =
      this.modalClassOverride =
      this.titleOverride =
      this.modalBodyComponent =
        null;
    this.opts = {};
  }

  hide() {
    $(".d-modal.fixed-modal").modal("hide");
  }

  reopen() {
    $(".d-modal.fixed-modal").modal("show");
  }

  get #isRendered() {
    return !!this.modalBodyComponent;
  }
}
