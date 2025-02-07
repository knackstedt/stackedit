import { LibraryItems } from '@excalidraw/excalidraw/types/types';

export const loadLibs: () => Promise<LibraryItems> = () => {
    return Promise.all([
        import('../../assets/excalidraw-libraries/post-it.json'),
        import('../../assets/excalidraw-libraries/lo-fi-wireframing-kit.json'),
        import('../../assets/excalidraw-libraries/UML-ER-library.json')
    ]) as any

}
