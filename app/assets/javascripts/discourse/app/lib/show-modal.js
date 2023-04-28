import { getOwner } from "discourse-common/lib/get-owner";

export default function (name, opts) {
  opts = opts || {};

  let container = getOwner(this);
  if (container.isDestroying || container.isDestroyed) {
    return;
  }

  const modalService = container.lookup("service:modal");

  return modalService.show(name, opts);
}
