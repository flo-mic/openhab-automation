// Add an item to the item registry
function addItem(itemName = undefined, itemType = undefined, label = undefined, groups = undefined, tags = undefined) {
  let item = items.getItem(itemName, true);
  if(item) {
      return item;
  } else {
      return items.addItem({
        name: itemName,
        label: label,
        type: itemType,
        groups: groups,
        tags: tags
      });
  }
}

// Remove item from registry
function removeItem(itemName){
  let item = items.getItem(itemName, true);
  if(item) {
    try {
      this.getItemGroups().forEach(group => this.removeItemGroupLink(itemName, group.name));
      this.getItemMembers().forEach(member => this.removeItemMemberLink(itemName, member.name));
      items.removeItem(item);
    } catch (e) {}
  }
}

// Get all groups an item belongs to
function getItemGroups(itemName) {
  let item = items.getItem(itemName);
  return item.groupNames.map(group => items.getItem(group));
}

// Remove item group link
function removeItemGroupLink(itemName, groupName) {
  let item = items.getItem(itemName);
  let group = items.getItem(groupName);
  item.removeGroup(group);
}

// Get all members of an item
function getItemMembers(itemName) {
  let item = items.getItem(itemName);
  return item.members.map(member => items.getItem(member));
}

// Remove item member link
function removeItemMemberLink(itemName, memberName) {
  let item = items.getItem(itemName);
  let member = items.getItem(memberName);
  member.removeGroup(item);
}

function getParentItemInModel(item) {
  var parentItem = null;
  if(typeof item === "string") {
    item = items.getItem(item);
  }
  item.groupNames.forEach(groupName => {
    let group = items.getItem(groupName);
    let groupSemanticMetadata = group.getMetadataValue("semantics");
    if(groupSemanticMetadata && groupSemanticMetadata.startsWith("Location_")) {
      parentItem = group;
    }
  });
  return parentItem;
}