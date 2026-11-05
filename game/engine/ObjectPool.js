/* ==========================================================================
   ReChoice - js/engine/ObjectPool.js
   Generic Object Pool Engine - Quản lý và tái sử dụng bộ nhớ hiệu năng cao
   ========================================================================== */
'use strict';

class ObjectPool {
  /**
   * @param {Function} factoryFn Hàm khởi tạo đối tượng mới khi cạn pool
   * @param {number} initialSize Số lượng đối tượng cấp phát trước (tùy chọn)
   */
  constructor(factoryFn, initialSize = 0) {
    this.factoryFn = factoryFn;
    this.items = [];      // Toàn bộ đối tượng đã tạo
    this.freeList = [];   // Các đối tượng đang rảnh rỗi sẵn sàng mượn

    for (let i = 0; i < initialSize; i++) {
      const obj = this.factoryFn();
      obj.on = false;
      this.items.push(obj);
      this.freeList.push(obj);
    }
  }

  /**
   * Mượn một đối tượng từ pool (nếu hết sẽ tự động tạo mới)
   * @returns {any}
   */
  get() {
    let obj;
    if (this.freeList.length > 0) {
      obj = this.freeList.pop();
    } else {
      obj = this.factoryFn();
      this.items.push(obj);
    }
    obj.on = true;
    if (obj.m) obj.m.visible = true;
    return obj;
  }

  /**
   * Trả đối tượng về pool khi không dùng nữa
   * @param {any} obj 
   */
  free(obj) {
    if (!obj || !obj.on) return;
    obj.on = false;
    if (obj.m) obj.m.visible = false;
    this.freeList.push(obj);
  }

  /**
   * Thu hồi toàn bộ đối tượng đang hoạt động về pool
   */
  clear() {
    for (let i = 0; i < this.items.length; i++) {
      const obj = this.items[i];
      if (obj.on) {
        obj.on = false;
        if (obj.m) obj.m.visible = false;
        this.freeList.push(obj);
      }
    }
  }

  /**
   * Duyệt qua toàn bộ các đối tượng đang hoạt động
   * @param {Function} callback 
   */
  forEachActive(callback) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.on) callback(item, i);
    }
  }
}
