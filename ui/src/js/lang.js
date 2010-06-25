
/**
 * For common utilities
 */
var lng = {

  emptyFn : function(){},

  /**
   * Check if object is empty or not.
   *
   * @param {Object} v To check object
   * @param {Boolean} allowEmptyObject Set to true, empty string and empty array returns false
   * @return {Boolean}
   */
  isEmpty : function(v, allowEmptyObject) {
    if (v === null 
    || v === undefined 
    || (!allowEmptyObject && v === "") 
    || (!allowEmptyObject && lng.isArray(v) && v.length === 0)) {
      return true;
    }
    return false;
  },

  /**
   * Check if object is Array or not.
   * @param {Object} v Check object
   */
  isArray : function(v) {
    return Object.prototype.toString.apply(v) === "[object Array]";
  },

  /**
   * Check is object is function
   */
  isFunction : function(f) {
    return typeof(f) == 'function' || f instanceof Function;
  },

  /**
   * Bind this object to the function.
   *
   * @param {Function} fn Call function
   * @param {Object} thisObj This object
   */
  bind : function(fn, thisObj) {
    return function(){fn.apply(thisObj, arguments)};
  }

}
