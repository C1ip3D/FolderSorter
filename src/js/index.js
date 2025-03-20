// const permissionBtn = document.getElementById('permission-btn');

// permissionBtn.addEventListener('click', requestPermissions);

// async function requestPermissions() {
//   try {
//     console.log('Requesting permissions...');
//     const result = await window.electronAPI.requestDirectory();

//     if (result.granted) {
//       organizationStep.classList.add('active');
//       permissionBtn.classList.add('success');
//       permissionBtn.textContent = 'Permission Granted! ✓';
//       console.log('Permission granted:', result.directory);
//     } else {
//       permissionBtn.classList.add('error');
//       permissionBtn.textContent = 'Permission Denied! Try Again';
//     }
//   } catch (error) {
//     console.error('Permission request failed:', error);
//     permissionBtn.classList.add('error');
//     permissionBtn.textContent = 'Error! Try Again';
//   }
// }


window.addEventListener('DOMContentLoaded', () => {
    const permissionBtn = document.getElementById('permission-btn');
    const organizationStep = document.querySelector('.organization');

    if (!permissionBtn) {
        console.error('Permission button not found');
        return;
    }

    async function requestPermissions() {
        try {
            console.log('Requesting permissions...');
            const result = await window.electronAPI.requestDirectory();

            if (result.granted) {
                organizationStep.classList.add('active');
                permissionBtn.classList.add('success');
                permissionBtn.textContent = 'Permission Granted! ✓';
                console.log('Permission granted:', result.directory);
            } else {
                permissionBtn.classList.add('error');
                permissionBtn.textContent = 'Permission Denied! Try Again';
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            permissionBtn.classList.add('error');
            permissionBtn.textContent = 'Error! Try Again';
        }
    }

    permissionBtn.addEventListener('click', requestPermissions);

    
});