import IconAlignLeft from 'quill/assets/icons/align-left.svg';
import IconAlignCenter from 'quill/assets/icons/align-center.svg';
import IconAlignRight from 'quill/assets/icons/align-right.svg';
import IconMinimize from 'quill/assets/icons/collapse-two-arrows-diagonal-symbol.svg';
import { BaseModule } from './BaseModule';
import Quill from 'quill';

const Parchment = Quill.imports.parchment;
const FloatStyle = new Parchment.Attributor.Style('float', 'float');
const MarginStyle = new Parchment.Attributor.Style('margin', 'margin');
const DisplayStyle = new Parchment.Attributor.Style('display', 'display');

export class Toolbar extends BaseModule {
    onCreate = () => {
		// Setup Toolbar
        this.toolbar = document.createElement('div');
        Object.assign(this.toolbar.style, this.options.toolbarStyles);
        this.overlay.appendChild(this.toolbar);

        // Setup Buttons
        this._defineAlignments();
        this._addToolbarButtons();

        // Setup Minimize
		this._addMinimizeButton();
	};

	// The toolbar and its children will be destroyed when the overlay is removed
    onDestroy = () => {};

    onUpdate = () => {
		this.overlays.forEach(obj => {
			this._positionOverlay(obj);
		});
	};

    _defineAlignments = () => {
        this.alignments = [
            {
                icon: IconAlignLeft,
                apply: () => {
                    DisplayStyle.add(this.img, 'inline');
                    FloatStyle.add(this.img, 'left');
                    MarginStyle.add(this.img, '0 1em 1em 0');
                },
                isApplied: () => FloatStyle.value(this.img) == 'left',
            },
            {
                icon: IconAlignCenter,
                apply: () => {
                    DisplayStyle.add(this.img, 'block');
                    FloatStyle.remove(this.img);
                    MarginStyle.add(this.img, 'auto');
                },
                isApplied: () => MarginStyle.value(this.img) == 'auto',
            },
            {
                icon: IconAlignRight,
                apply: () => {
                    DisplayStyle.add(this.img, 'inline');
                    FloatStyle.add(this.img, 'right');
                    MarginStyle.add(this.img, '0 0 1em 1em');
                },
                isApplied: () => FloatStyle.value(this.img) == 'right',
            },
        ];
    };

    _addToolbarButtons = () => {
		const buttons = [];
		this.alignments.forEach((alignment, idx) => {
			const button = document.createElement('span');
			buttons.push(button);
			button.innerHTML = alignment.icon;
			button.addEventListener('click', () => {
					// deselect all buttons
				buttons.forEach(button => button.style.filter = '');
				if (alignment.isApplied()) {
						// If applied, unapply
					FloatStyle.remove(this.img);
					MarginStyle.remove(this.img);
					DisplayStyle.remove(this.img);
				}				else {
						// otherwise, select button and apply
					this._selectButton(button);
					alignment.apply();
				}
					// image may change position; redraw drag handles
				this.requestUpdate();
			});
			Object.assign(button.style, this.options.toolbarButtonStyles);
			if (idx > 0) {
				button.style.borderLeftWidth = '0';
			}
			Object.assign(button.children[0].style, this.options.toolbarButtonSvgStyles);
			if (alignment.isApplied()) {
					// select button if previously applied
				this._selectButton(button);
			}
			this.toolbar.appendChild(button);
		});
    };

    _addMinimizeButton = () => {
		const minimize = document.createElement("div");
		Object.assign(minimize.style, this.options.toolbarButtonStyles);
		minimize.innerHTML = IconMinimize;
		this.toolbar.appendChild(minimize);

		minimize.addEventListener("click", this._handleMinimize);
	};

    _handleMinimize = event => {
		(img => {
			// Need fullsize width when expanding <img> again
			const fullsizeWidth = img.width;

			const minimizeOverlay = document.createElement("div");
			Object.assign(minimizeOverlay.style, this.options.minimizeOverlayStyles);
			minimizeOverlay.style.width = fullsizeWidth + "px";
			let overlayObj = {
				dom: minimizeOverlay,
				img: img
			};
			this.overlays.push(overlayObj);

			this._positionOverlay(overlayObj);

			// Set the text as the filename pulled from the <img> src
			let label = document.createElement("div");
			label.textContent = img.src.substring(img.src.lastIndexOf("/") + 1) + " +";
			Object.assign(label.style, {
				display: "inline-block",
				marginLeft: "50%",
				transform: "translateX(-50%)"
			});
			minimizeOverlay.append(label);

			// Add the overlay to the parent container of the quill editor
			this.quill.root.parentElement.appendChild(minimizeOverlay);

			// Watch for changes to the img dom in order to prevent cases of overlay overlapping
			// on quill content, i.e. expanding an image when there is a collapsed right under
			// the soon to be expanded overlay.
			let observer = new MutationObserver(list => {
				this._positionOverlay(overlayObj);
			});
			observer.observe(this.quill.root, {
				attributes: true,
				childList: true,
				characterData: true
			});

			this._hideImage(img);

			minimizeOverlay.addEventListener("click", e => {
				this._removeOverlay(overlayObj, observer, fullsizeWidth);
			});

			this.hide();
		})(this.img);
	};

    _positionOverlay = ({ dom, img }) => {
		// Calculate offsets to position the overlay
		let imgRect = img.getBoundingClientRect();

		// Get container of quill editor.
		let editorDOM = this.quill.root.parentElement;
		let editorRect = editorDOM.getBoundingClientRect();
		let left = imgRect.left - editorRect.left - 1;
		let top = imgRect.top - editorRect.top;
		let scrollTop = editorDOM.scrollTop;

		// Style the overlay
		dom.style.left = "" + left + "px";
		dom.style.top = "" + (top + scrollTop) + "px";
	};

    _hideImage = (img) => {
		// Hide and "resize" <img> to give the impression of being minimized
		let imgIndex = this.quill.getIndex(Quill.find(img));
		this.quill.formatText(imgIndex, 1, {
			'height': '35px',
			'visibility': 'hidden'
		}, 'silent');
	};

    _removeOverlay = ({ dom, img }, obs, width) => {
		dom.style.display = "none";
		obs.disconnect();

		let imgIndex = this.quill.getIndex(Quill.find(img));
		this.quill.formatText(imgIndex, 1, {
			'height': '',
			'visibility': ''
		}, 'silent');
		img.click();
		this.overlays = this.overlays.reduce((acc, overlay) => {
			if (overlay.dom !== dom)
				acc.push(overlay);
			return acc;
		}, []);
		dom.remove();
	};

    _selectButton = (button) => {
		button.style.filter = 'invert(20%)';
    };

}
