// 工具函数
function debounce(func, wait) {
  let timeout = null;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, arguments);
    }, wait);
  };
}

function throttle(fn, wait) {
  var timer = null;
  return function() {
    var context = this;
    var args = arguments;
    if (!timer) {
      timer = setTimeout(function() {
        fn.apply(context, args);
        timer = null;
      }, wait);
    }
  };
}

function hasClass(el, className) {
  const reg = new RegExp('(^|\\s)' + className + '(\\s|$)');
  return reg.test(el.className);
}

function addClass(el, className) {
  if (hasClass(el, className)) {
    return;
  }
  const newClass = el.className.split(/\s+/);
  newClass.push(className);
  el.className = newClass.join(' ');
}

const elementStyle = document.createElement('div').style;
const vendor = (() => {
  const transformNames = {
    webkit: 'webkitTransform',
    Moz: 'MozTransform',
    O: 'OTransform',
    ms: 'msTransform',
    standard: 'transform'
  };
  for (const key in transformNames) {
    if (elementStyle[transformNames[key]] !== undefined) {
      return key;
    }
  }
  return false;
})();

function prefixStyle(style) {
  if (vendor === false) {
    return false;
  }
  if (vendor === 'standard') {
    return style;
  }
  return vendor + style.charAt(0).toUpperCase() + style.substr(1);
}

const transform = prefixStyle('transform');

// Waterfall 组件
const Waterfall = {
  name: 'Waterfall',
  props: {
    list: {
      type: Array,
      default: () => []
    },
    gutter: {
      type: Number,
      default: 20
    },
    width: {
      type: Number,
      default: 250
    },
    breakpoints: {
      type: Object,
      default: () => ({
        1200: { rowPerView: 3 },
        800: { rowPerView: 2 },
        500: { rowPerView: 1 }
      })
    },
    animationEffect: {
      type: String,
      default: 'fadeIn'
    },
    animationDuration: {
      type: String,
      default: '0s'
    },
    animationDelay: {
      type: String,
      default: '0s'
    },
    backgroundColor: {
      type: String,
      default: 'transparent'
    }
  },
  data() {
    return {
      grid: null,
      gridItem: [],
      containerWidth: -1,
      itemsPosX: [],
      itemsPosY: []
    };
  },
  computed: {
    itemWidth() {
      if (this.containerWidth === -1) {
        return 0;
      } else {
        const sizeArr = Object.keys(this.breakpoints)
          .map(size => Number(size))
          .sort((a, b) => a - b);

        for (let i = 0; i < sizeArr.length; i++) {
          const size = sizeArr[i];
          if (this.containerWidth !== 0 && this.containerWidth <= size) {
            return Math.floor(
              (this.containerWidth - this.gutter) /
                this.breakpoints[size].rowPerView -
                this.gutter
            );
          }
        }
        return this.width;
      }
    },
    rowCount() {
      if (this.containerWidth === -1) {
        return 0;
      } else {
        return Math.floor(
          (this.containerWidth - this.gutter) / (this.itemWidth + this.gutter)
        );
      }
    },
    shiftX() {
      const contentWidth =
        this.rowCount * (this.itemWidth + this.gutter) + this.gutter;
      return (this.containerWidth - contentWidth) / 2;
    },
    containerHeight() {
      if (this.itemsPosY.length === 0) return 0;
      return this.itemsPosY
        .slice(0)
        .sort((a, b) => a - b)
        .pop();
    },
    containerStyle() {
      return {
        height: `${this.containerHeight}px`,
        background: this.backgroundColor
      };
    }
  },
  watch: {
    list: {
      handler: function(val) {
        if (this.grid) {
          this.containerWidth = this.grid.clientWidth;
          this.$nextTick(() => {
            this.calcPos();
          });
        }
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.grid) {
        this.containerWidth = this.grid.clientWidth;
        this.calcPos();
      }
    });
    window.onresize = debounce(this.resize, 100);
  },
  beforeUpdate() {
    this.gridItem = [];
  },
  methods: {
    setGridRef(el) {
      if (el) {
        this.grid = el;
      }
    },
    setGridItemRef(el) {
      if (el) {
        this.gridItem.push(el);
      }
    },
    calcPos() {
      this.itemsPosX = [];
      this.itemsPosY = [];

      const itemsNodeList = this.gridItem;
      if (!itemsNodeList || itemsNodeList.length === 0) {
        return;
      }

      if (this.rowCount === 0) {
        return;
      }

      for (let i = 0; i < this.rowCount; i++) {
        this.itemsPosX.push(
          this.shiftX + this.gutter * (i + 1) + this.itemWidth * i
        );
        this.itemsPosY.push(this.gutter);
      }

      itemsNodeList.forEach(item => {
        const minPosY = this.itemsPosY
          .slice(0)
          .sort((a, b) => a - b)
          .shift();
        const index = this.itemsPosY.indexOf(minPosY);
        const posX = this.itemsPosX[index];
        const posY = minPosY;

        item.style.visibility = 'hidden';
        item.style.position = 'absolute';
        item.style[transform] = 'translate3d(' + posX + 'px,' + posY + 'px, 0)';
        
        const itemHeight = item.getBoundingClientRect().height;
        this.itemsPosY[index] += itemHeight + this.gutter;

        const content = item.firstChild;
        if (content && !hasClass(content, 'animated')) {
          content.style['animation-duration'] = this.animationDuration;
          content.style['-webkit-animation-duration'] = this.animationDuration;
          content.style['animation-delay'] = this.animationDelay;
          content.style['-webkit-animation-delay'] = this.animationDelay;
          content.style.visibility = 'visible';

          addClass(content, 'animated');
          addClass(content, this.animationEffect);
        }
      });
    },
    resize() {
      if (this.grid) {
        this.containerWidth = this.grid.clientWidth;
        this.$nextTick(() => {
          this.calcPos();
        });
      }
    },
    refresh: throttle(function() {
      if (this.grid) {
        this.containerWidth = this.grid.clientWidth;
        this.$nextTick(() => {
          this.calcPos();
        });
      }
    }, 300)
  },
  template: `
    <div
      :ref="setGridRef"
      class="waterfull-grid"
      :style="containerStyle"
    >
      <div
        v-for="(i, index) in list"
        :ref="setGridItemRef"
        :key="index"
        class="waterfull-item"
        :style="{width: itemWidth + 'px'}"
      >
        <div class="waterfull-item-box">
          <slot
            name="item"
            :data="i"
          />
        </div>
      </div>
    </div>
  `
};

