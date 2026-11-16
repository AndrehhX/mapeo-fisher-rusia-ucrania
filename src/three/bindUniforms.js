/**
 * React Three Fiber copia cada uniform al aplicar la prop `uniforms`, así que modificar
 * `uniforms.x.value` en useFrame no llega a la GPU. Este callback ref hace que el material
 * use exactamente nuestro objeto de uniforms.
 *   <shaderMaterial ref={bindUniforms(u)} uniforms={u} … />
 */
export const bindUniforms = (uniforms) => (material) => {
  if (material && material.uniforms !== uniforms) material.uniforms = uniforms
}
