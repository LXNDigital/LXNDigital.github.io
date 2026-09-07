(function () {

    const DATA_PATH =
        window.CONTINUITY_JOURNEY_DATA || '/data/continuity-journey.json';

    function track(n, l) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', n, {
                event_category: 'Continuity Journey',
                event_label: l,
                value: 1
            });
        }
    }

    function currentPath() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    function el(tag, cls) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }

    async function init() {

        try {

            const res = await fetch(DATA_PATH);

            if (!res.ok) {
                throw new Error('data');
            }

            const data = await res.json();


            /* ---------------------------------------------------------
               Launcher
            --------------------------------------------------------- */

            const launcher = el('button', 'cj-launcher');

            launcher.type = 'button';
            launcher.setAttribute('aria-haspopup', 'dialog');
            launcher.setAttribute('aria-expanded', 'false');

            launcher.innerHTML =
                '<span class="cj-launcher-icon" aria-hidden="true"></span>' +
                '<span>' + data.label + '</span>';


            /* ---------------------------------------------------------
               Backdrop
            --------------------------------------------------------- */

            const backdrop = el('div', 'cj-backdrop');


            /* ---------------------------------------------------------
               Journey panel
            --------------------------------------------------------- */

            const panel = el('aside', 'cj-panel');

            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-label', data.title);
            panel.setAttribute('aria-hidden', 'true');

            panel.innerHTML =
                '<div class="cj-header">' +
                    '<div class="cj-title-row">' +
                        '<div>' +
                            '<h2 class="cj-title">' +
                                data.title +
                            '</h2>' +
                            '<p class="cj-intro">' +
                                data.intro +
                            '</p>' +
                            '<p class="cj-hint">' +
                                '<i class="bi bi-arrow-right-circle me-2"></i>' +
                                'Choose your next step.' +
                            '</p>' +
                        '</div>' +
                        '<button class="cj-close" type="button" ' +
                            'aria-label="Close continuity journey">' +
                            '&times;' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="cj-body"></div>';


            document.body.appendChild(launcher);
            document.body.appendChild(backdrop);
            document.body.appendChild(panel);


            /* ---------------------------------------------------------
               Journey steps
            --------------------------------------------------------- */

            const body = panel.querySelector('.cj-body');
            const page = currentPath();

            data.steps.forEach(step => {

                const cur =
                    Array.isArray(step.matches) &&
                    step.matches.includes(page);

                const item = el(
                    'section',
                    'cj-step' + (cur ? ' current open' : '')
                );

                item.dataset.step = step.id;


                /*
                 * Optional second CTA.
                 *
                 * Existing steps continue to work exactly as before.
                 * A second button is only generated when both
                 * cta2 and url2 are supplied in the JSON.
                 */

                const secondaryCta =
                    step.cta2 && step.url2
                        ? '<a class="cj-step-link cj-step-link-secondary" ' +
                            'href="' + step.url2 + '">' +
                            step.cta2 +
                          '</a>'
                        : '';


                item.innerHTML =

                    '<button class="cj-step-toggle" ' +
                        'type="button" ' +
                        'aria-expanded="' + (cur ? 'true' : 'false') + '">' +

                        '<span class="cj-step-number">' +
                            step.id +
                        '</span>' +

                        '<span>' +
                            '<span class="cj-step-heading">' +
                                step.title +
                            '</span>' +

                            '<span class="cj-step-microcopy">' +
                                step.microcopy +
                            '</span>' +
                        '</span>' +

                    '</button>' +

                    '<div class="cj-step-detail">' +

                        '<p>' +
                            step.overlay +
                        '</p>' +

                        '<div class="cj-step-actions">' +

                            '<a class="cj-step-link" ' +
                                'href="' + step.url + '">' +
                                step.cta +
                            '</a>' +

                            secondaryCta +

                        '</div>' +

                    '</div>';


                /* -----------------------------------------------------
                   Step interaction
                ----------------------------------------------------- */

                const toggle =
                    item.querySelector('.cj-step-toggle');

                toggle.addEventListener('click', () => {

                    const open =
                        item.classList.toggle('open');

                    toggle.setAttribute(
                        'aria-expanded',
                        String(open)
                    );

                    track(
                        'continuity_journey_step_open',
                        step.title
                    );

                });


                /*
                 * Track every CTA within the step.
                 *
                 * This works for both the original CTA and the new
                 * optional secondary CTA.
                 */

                item
                    .querySelectorAll('.cj-step-link')
                    .forEach(link => {

                        link.addEventListener('click', () => {

                            track(
                                'continuity_journey_cta_click',
                                step.title +
                                    ' → ' +
                                    link.textContent.trim()
                            );

                        });

                    });


                body.appendChild(item);

            });


            /* ---------------------------------------------------------
               Panel accessibility / interactivity
            --------------------------------------------------------- */

            function setPanelInteractivity(isOpen) {

                panel.setAttribute(
                    'aria-hidden',
                    String(!isOpen)
                );

                if ('inert' in panel) {

                    panel.inert = !isOpen;
                    return;

                }

                panel
                    .querySelectorAll(
                        'a,button,input,select,textarea,[tabindex]'
                    )
                    .forEach(node => {

                        if (isOpen) {

                            const previous =
                                node.getAttribute(
                                    'data-cj-tabindex'
                                );

                            if (previous !== null) {

                                if (previous === '') {
                                    node.removeAttribute('tabindex');
                                } else {
                                    node.setAttribute(
                                        'tabindex',
                                        previous
                                    );
                                }

                                node.removeAttribute(
                                    'data-cj-tabindex'
                                );

                            }

                        } else {

                            if (
                                !node.hasAttribute(
                                    'data-cj-tabindex'
                                )
                            ) {

                                node.setAttribute(
                                    'data-cj-tabindex',
                                    node.getAttribute(
                                        'tabindex'
                                    ) || ''
                                );

                            }

                            node.setAttribute(
                                'tabindex',
                                '-1'
                            );

                        }

                    });

            }


            setPanelInteractivity(false);


            /* ---------------------------------------------------------
               Open / close
            --------------------------------------------------------- */

            function open() {

                launcher.setAttribute(
                    'aria-expanded',
                    'true'
                );

                setPanelInteractivity(true);

                backdrop.classList.add('open');
                panel.classList.add('open');

                const closeButton =
                    panel.querySelector('.cj-close');

                if (closeButton) {
                    closeButton.focus({
                        preventScroll: true
                    });
                }

                track(
                    'continuity_journey_open',
                    page
                );

            }


            function close() {

                const focusWasInside =
                    panel.contains(
                        document.activeElement
                    );

                launcher.setAttribute(
                    'aria-expanded',
                    'false'
                );

                backdrop.classList.remove('open');
                panel.classList.remove('open');

                setPanelInteractivity(false);

                if (focusWasInside) {

                    launcher.focus({
                        preventScroll: true
                    });

                }

                track(
                    'continuity_journey_close',
                    page
                );

            }


            launcher.addEventListener(
                'click',
                open
            );

            backdrop.addEventListener(
                'click',
                close
            );

            panel
                .querySelector('.cj-close')
                .addEventListener(
                    'click',
                    close
                );


            document.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Escape' &&
                        panel.classList.contains('open')
                    ) {
                        close();
                    }

                }
            );


        } catch (e) {

            console.error(
                'Continuity journey failed to initialise:',
                e
            );

        }

    }


    /* -------------------------------------------------------------
       Initialise
    ------------------------------------------------------------- */

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();

    }

})();