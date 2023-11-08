import { LibraryItems } from '@excalidraw/excalidraw/types/types';

export const loadLibs: () => Promise<LibraryItems> = () => {
    return Promise.all([
        import('../../assets/excalidraw-libraries/post-it.json'),
        import('../../assets/excalidraw-libraries/aws-architecture-icons.json'),
        import('../../assets/excalidraw-libraries/data-viz.json'),
        import('../../assets/excalidraw-libraries/decision-flow-control.json'),
        import('../../assets/excalidraw-libraries/dropdowns.json'),
        import('../../assets/excalidraw-libraries/forms.json'),
        import('../../assets/excalidraw-libraries/google-icons.json'),
        import('../../assets/excalidraw-libraries/lo-fi-wireframing-kit.json'),
        import('../../assets/excalidraw-libraries/microsoft-azure-cloud-icons.json'),
        import('../../assets/excalidraw-libraries/system-design-template.json'),
        import('../../assets/excalidraw-libraries/UML-ER-library.json'),
        import('../../assets/excalidraw-libraries/web-kit.json'),
    ]) as any

}
