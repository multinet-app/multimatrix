// Code taken from https://stackoverflow.com/q/59527846
import Vue from 'vue';

const WindowInstanceMap = new Vue({
  data() {
    return {
      innerWidth: window.innerWidth,
    };
  },
  created() {
    window.addEventListener('resize', () => {
      this.innerWidth = window.innerWidth;
    });
  },
});

export default WindowInstanceMap;
